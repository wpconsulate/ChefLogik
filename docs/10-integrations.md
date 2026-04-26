# External Integration Specifications

## Per-Tenant API Key Storage

Every external API key is stored PER TENANT in an encrypted `tenant_integrations` table — never in `.env` or Kubernetes secrets for tenant-specific keys. The only keys in Kubernetes secrets are the platform-level defaults (used if a tenant hasn't configured their own).

```sql
CREATE TABLE tenant_integrations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL FK → tenants,
  integration_type VARCHAR(50) NOT NULL,  -- 'uber_eats', 'wolt', 'stripe_terminal', 'twilio'
  credentials TEXT NOT NULL,              -- encrypted at rest via Laravel encrypt:array cast
  settings JSONB DEFAULT '{}',            -- plaintext; includes branch_id + store_id/venue_id for webhook lookup
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

Credentials are encrypted using Laravel's `encrypt()` / `decrypt()` before storage. Never log credentials.

---

## 1. Uber Eats Integration

**OAuth 2.0 client credentials flow**

```php
class UberEatsService
{
    private string $clientId;
    private string $clientSecret;
    private string $storeId;

    // Token refresh — called by scheduled job every 55 minutes
    public function refreshToken(): string
    {
        $response = Http::post('https://login.uber.com/oauth/v2/token', [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'grant_type'    => 'client_credentials',
            'scope'         => 'eats.store eats.order',
        ]);

        $token = $response->json('access_token');
        cache()->put("uber_eats_token:{$this->storeId}", $token, now()->addMinutes(55));
        return $token;
    }

    // 86 sync — called by SyncEightySixToPlatformsJob on 'high' queue
    public function setItemAvailability(string $uberItemId, bool $available): void
    {
        retry(3, function() use ($uberItemId, $available) {
            Http::withToken($this->getToken())
                ->patch("https://api.uber.com/v2/eats/stores/{$this->storeId}/menus/items/{$uberItemId}", [
                    'suspension_status' => $available ? 'ENABLED' : 'DISABLED',
                ]);
        }, backoff: [5000, 30000, 120000]);
    }

    // Pause/resume store
    public function pauseStore(): void { ... }
    public function resumeStore(): void { ... }
}
```

**Webhook validation**
```php
// Verify Uber Eats webhook signature
public function verifyWebhook(Request $request): bool
{
    $signature = $request->header('X-Uber-Signature');
    $expected = hash_hmac('sha256', $request->getContent(), $this->webhookSecret);
    return hash_equals($expected, $signature);
}
```

**Order webhook processing** (fires async job, responds 200 immediately)
```php
class UberEatsWebhookController
{
    public function handle(Request $request): JsonResponse
    {
        if (!$this->uberEatsService->verifyWebhook($request)) {
            abort(403);
        }

        $eventId = $request->input('event_id');

        // Idempotency check
        if (cache()->has("webhook:uber:{$eventId}")) {
            return response()->json(['status' => 'already_processed']);
        }
        cache()->put("webhook:uber:{$eventId}", true, now()->addHours(72));

        // Dispatch to queue — respond immediately
        ProcessUberEatsOrderJob::dispatch($request->all())->onQueue('critical');

        return response()->json(['status' => 'accepted']);
    }
}
```

**Rate limits:** Menu API: 100 req/min. Store Status: 10 req/min. Retry on 5xx with exponential backoff (5s, 30s, 120s). On 429: wait 60 seconds.

---

## 2. Wolt Integration

Same architecture as Uber Eats. Key differences:

**Authentication:** Wolt uses OAuth 2.0 client credentials (same as Uber Eats).

```php
class WoltService
{
    // Token refresh — called by scheduled job every 55 minutes
    public function refreshToken(): string
    {
        $response = Http::post('https://authentication.wolt.com/v1/wauth2/access_token', [
            'client_id'     => $this->clientId,
            'client_secret' => $this->clientSecret,
            'grant_type'    => 'client_credentials',
        ]);

        $token = $response->json('access_token');
        cache()->put("wolt_token:{$this->venueId}", $token, now()->addMinutes(55));
        return $token;
    }

    // 86 sync — called by SyncEightySixToPlatformsJob on 'high' queue
    public function setItemAvailability(string $woltItemId, bool $available): void
    {
        retry(3, function() use ($woltItemId, $available) {
            Http::withToken($this->getToken())
                ->patch("https://restaurant-api.wolt.com/v1/venues/{$this->venueId}/items/{$woltItemId}", [
                    'enabled' => $available,
                ]);
        }, backoff: [5000, 30000, 120000]);
    }

    // Pause/resume venue
    public function pauseStore(): void { ... }
    public function resumeStore(): void { ... }
}
```

**Webhook validation:**
```php
// Verify Wolt webhook signature
public function verifyWebhook(Request $request): bool
{
    $signature = $request->header('X-Wolt-Signature-256');
    $expected  = 'sha256=' . hash_hmac('sha256', $request->getContent(), $this->webhookSecret);
    return hash_equals($expected, $signature);
}
```

**Webhook payload:** Different schema from Uber Eats. The normalisation layer in `ProcessWoltOrderJob` converts it to the same internal order DTO before any business logic runs.

**Commission:** Wolt commission rate stored in `tenant_integrations.settings.commission_rate`. Applied to all Wolt orders in net revenue calculation.

**Rate limits:** Menu API: 60 req/min. Store Status: 10 req/min. Same retry pattern as Uber Eats.

---

## 3. Stripe Integration

**Products used:**
- `Stripe\PaymentIntent` — online orders, QR pay
- `Stripe\Terminal` + `Stripe\PaymentIntent` — in-person POS
- `Stripe\Refund` — all refunds
- Stripe Webhooks — payment status source of truth

```php
class StripeService
{
    public function __construct(private \Stripe\StripeClient $stripe) {}

    // Create PaymentIntent for online/QR orders
    public function createPaymentIntent(int $amountCents, string $currency, string $orderId): \Stripe\PaymentIntent
    {
        return $this->stripe->paymentIntents->create([
            'amount'   => $amountCents,
            'currency' => strtolower($currency),
            'metadata' => ['order_id' => $orderId, 'tenant_id' => auth()->user()->tenant_id],
        ]);
    }

    // Refund — always against original PaymentIntent
    public function refund(string $paymentIntentId, int $amountCents, string $reason): \Stripe\Refund
    {
        return $this->stripe->refunds->create([
            'payment_intent' => $paymentIntentId,
            'amount'         => $amountCents,
            'reason'         => $reason,  // 'duplicate', 'fraudulent', 'requested_by_customer'
        ]);
    }
}

// Stripe webhook — critical queue
class StripeWebhookController
{
    public function handle(Request $request): JsonResponse
    {
        // Verify Stripe signature FIRST
        try {
            $event = \Stripe\Webhook::constructEvent(
                $request->getContent(),
                $request->header('Stripe-Signature'),
                config('services.stripe.webhook_secret')
            );
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            abort(403);
        }

        // Idempotency
        if (cache()->has("webhook:stripe:{$event->id}")) {
            return response()->json(['status' => 'already_processed']);
        }
        cache()->put("webhook:stripe:{$event->id}", true, now()->addHours(72));

        match ($event->type) {
            'payment_intent.succeeded'       => ProcessStripePaymentJob::dispatch($event)->onQueue('critical'),
            'payment_intent.payment_failed'  => ProcessStripePaymentFailedJob::dispatch($event)->onQueue('critical'),
            'charge.refunded'                => ProcessStripeRefundJob::dispatch($event)->onQueue('critical'),
            'charge.dispute.created'         => ProcessStripeDisputeJob::dispatch($event)->onQueue('high'),
            default => null,
        };

        return response()->json(['status' => 'accepted']);
    }
}
```

**PCI DSS:** No raw card data ever in application. `Stripe\Terminal` readers are P2PE-listed. SAQ A-EP compliance. Stripe API keys always in Kubernetes secrets.

---

## 4. Twilio SMS

```php
class TwilioService
{
    public function send(string $to, string $body, string $tenantId): string
    {
        // to must be E.164 format
        $message = $this->client->messages->create($to, [
            'from' => config('services.twilio.from'),
            'body' => $body,
            'statusCallback' => route('webhooks.twilio'),
        ]);

        // Log every outbound message
        NotificationLog::create([
            'tenant_id'    => $tenantId,
            'channel'      => 'sms',
            'recipient'    => $to,
            'message_sid'  => $message->sid,
            'status'       => $message->status,
        ]);

        return $message->sid;
    }

    // Twilio delivery receipt webhook
    public function handleStatusCallback(Request $request): void
    {
        NotificationLog::where('message_sid', $request->input('MessageSid'))
            ->update(['status' => $request->input('MessageStatus')]);

        // If failed booking confirmation → alert manager
        if ($request->input('MessageStatus') === 'failed') {
            $this->alertManagerOfFailedCriticalSMS($request->input('MessageSid'));
        }
    }
}
```

**STOP handling:** Twilio automatically manages STOP/UNSTOP replies. Sync opt-out list daily via `SyncTwilioOptOutsJob` → updates `customer_profiles.communication_prefs`.

**Rate limiting:** Batch campaign sends through Twilio Messaging Services with throughput controls. Max 3 automated messages per customer per 24 hours enforced at application level.

---

## 5. SendGrid Email

```php
class SendGridService
{
    public function send(string $to, string $templateId, array $templateData, bool $isTransactional = true): void
    {
        $email = new \SendGrid\Mail\Mail();
        $email->setFrom(config('services.sendgrid.from_email'), config('services.sendgrid.from_name'));
        $email->addTo($to);
        $email->setTemplateId($templateId);
        $email->addDynamicTemplateDatas($templateData);

        // Transactional emails bypass global unsubscribe
        // Marketing emails respect it
        if (!$isTransactional) {
            $email->setAsm(new \SendGrid\Mail\Asm(config('services.sendgrid.unsubscribe_group_id')));
        }

        $this->client->send($email);
    }
}
```

Template IDs are stored in `config/mail-templates.php` and managed in SendGrid's Dynamic Templates UI. Template changes require no code deployment.

---

## 6. Laravel Reverb (WebSocket)

```php
// Broadcasting channel definitions (routes/channels.php)

// Order updates — private, branch-scoped
Broadcast::channel('tenant.{tenantId}.branch.{branchId}.orders', function (User $user, string $tenantId, string $branchId) {
    return $user->tenant_id === $tenantId
        && ($user->hasAllBranchAccess() || in_array($branchId, $user->branch_ids));
});

// KDS channel — kitchen staff only
Broadcast::channel('tenant.{tenantId}.branch.{branchId}.kds', function (User $user, string $tenantId, string $branchId) {
    return $user->tenant_id === $tenantId
        && $user->can('kds.view')
        && ($user->hasAllBranchAccess() || in_array($branchId, $user->branch_ids));
});

// Table state — FOH staff
Broadcast::channel('tenant.{tenantId}.branch.{branchId}.tables', function (User $user, string $tenantId, string $branchId) {
    return $user->tenant_id === $tenantId
        && $user->can('reservations.view');
});

// Manager alerts — manager+ only
Broadcast::channel('tenant.{tenantId}.alerts', function (User $user, string $tenantId) {
    return $user->tenant_id === $tenantId
        && $user->can('analytics.branch_dashboard');
});
```
