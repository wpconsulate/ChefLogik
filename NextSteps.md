# ChefLogik — Next Steps

## Current State
- **Backend:** 371 tests passing (349 + 22 new Stripe tests)
- **Frontend:** All 12 modules complete (React 19 + TypeScript + MST)
- **Phase 1 Foundation:** ✓ Complete
- **Phase 2 Core Modules:** ✓ Complete
- **Phase 3 Intelligence & Platform:** ✓ Complete (except External Integrations)

---

## External Integrations Progress

### ✓ 1. Stripe Payments — COMPLETE
- `PaymentGatewayInterface` contract + `StripePaymentGateway` implementation (`stripe/stripe-php ^20`)
- `config/payment.php` driver config
- `PaymentService` — creates PaymentIntents, collects event deposits, delegates refunds
- `POST /api/v1/orders/{id}/payment` — creates PaymentIntent, returns `client_secret`
- `POST /api/v1/orders/{id}/refund` — partial or full refund via `RefundEngine`
- `POST /api/v1/events/{id}/payment` — event deposit PaymentIntent (was stub)
- `POST /api/webhooks/stripe` — signature verification + dispatches `ProcessStripeWebhookJob` to `critical` queue
- `ProcessStripeWebhookJob` handles: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- RefundEngine: real Stripe Refunds API call with fallback-to-manual-record on gateway failure
- Platform admin toggle: `platform.stripe_enabled` (PATCH /api/platform/settings) → returns 503 when disabled
- 22 tests covering all flows

### 2. SMS — Twilio ← START HERE
- `SmsProviderInterface` contract + `TwilioSmsProvider` implementation
- `config/sms.php` driver config
- Wire stubs: reservation reminders (24h + 2h jobs exist), customer OTP password reset, loyalty campaign dispatch

### 3. Email — Amazon SES
- `MAIL_MAILER=ses` (uses existing AWS credentials — no new package)
- Laravel Mailables: `WelcomeEmail`, `StaffPasswordResetEmail`, `CustomerPasswordResetEmail`, `BookingConfirmationEmail`
- Wire stubs: tenant welcome email in `TenantProvisioningService`, loyalty campaign email dispatch

### 4. Uber Eats + DoorDash *(after payments)*
- Real webhook ingestion for platform orders
- `SyncOrderToPlatformsJob` and `SyncMenuItemToPlatformsJob` stubs already exist

### 5. Kubernetes / Helm Charts
- Kubernetes manifests for app, workers, reverb
- Helm chart with environment-specific values
- See `docs/07-infrastructure.md` for the full spec

---

## Module Gaps — From Full Audit (2026-04-18)

Gaps identified by comparing all `docs/modules/` specs against the implementation.

### Orders
- [x] ~~**Stripe PaymentIntent creation + webhook handler**~~ *(done)*
- [x] ~~**Pre-paid online orders auto-confirmation after successful PaymentIntent**~~ *(done)*
- [x] ~~**Delivery platform 5-min auto-confirmation SLA job**~~ *(done)*
- [ ] `SyncOrderToPlatformsJob` stub → real Uber Eats / DoorDash API calls *(Phase 3)*
- [x] ~~**Stock restoration on pre-preparation cancellations**~~ *(done)*

### Menu
- [ ] Sub-categories (Category → Sub-category → Item — only 1 level of categories currently)
- [ ] `SyncMenuItemToPlatformsJob` stub → real platform sync *(Phase 3)*
- [ ] SKU ↔ platform `item_id` mapping table
- [ ] Price verification on incoming platform orders (flag if price differs by > $0.10)
- [ ] Dietary filters on public QR menu for logged-in customers

### Reservations
- [ ] No-show deposit requirement flag when `no_show_count >= configurable threshold`
- [ ] Loyalty member no-show forgiveness (configurable per tier)

### Events
- [x] ~~**Stripe deposit collection**~~ *(done)*
- [ ] Non-refundable booking fee policy per occasion type
- [ ] Credit limit enforcement — block new bookings for over-limit net-30 corporate accounts
- [ ] Run sheet PDF export
- [ ] Overdue pre-event task alerts via Reverb + push notification
- [ ] Minimum spend charge prompt at bill close

### Inventory
- [ ] KDS station assignment — items default to Pass; need dynamic routing (grill / fryer / cold / pass)
- [ ] Temperature log export (PDF/CSV for environmental health inspection)
- [ ] Manager alert when an order contains items whose only recipe is `draft` status

### Customers & Loyalty
- [ ] Event booking 2× loyalty multiplier — link event confirmation to `LoyaltyService`
- [ ] 30-day downgrade grace period warning before tier downgrade
- [ ] Points expiry warning notification at 12-month inactivity mark
- [ ] Manual profile merge endpoint (exception raised on duplicate, but no merge action exists)

### Analytics
- [ ] CLV formula: `avg_spend_per_visit × avg_visits_per_year × estimated_lifespan_years` — field exists, formula not coded
- [ ] COGS calculation: `opening_stock + purchases - closing_stock`
- [ ] Tax collected report endpoint (net_sales, tax_rate, tax_amount per category per period)
- [ ] RevPASH calculation must respect special operating hours for affected dates

### Staff
- [ ] Document expiry alert job — notify 30 days before driving licence / food hygiene / right-to-work expiry
- [ ] Staff push notification when Branch Manager publishes the weekly schedule

### Notifications — unblocked by confirmed decisions
- [ ] Reservation reminder SMS (24h + 2h — jobs exist, send is stubbed) *(Decision 8 confirmed)*
- [ ] Customer OTP / password reset SMS *(Decision 8 confirmed)*
- [ ] Loyalty campaign SMS dispatch *(Decision 8 confirmed)*
- [ ] Booking confirmation email *(Decision 9 confirmed)*
- [ ] Staff / customer password reset email *(Decision 9 confirmed)*
- [ ] Tenant welcome email in `TenantProvisioningService` *(Decision 9 confirmed)*

---

## Decisions — All Locked ✓

| Decision | Status | Choice |
|---|---|---|
| Decision 7 — Payment gateway | ✓ Confirmed | Stripe behind `PaymentGatewayInterface` |
| Decision 8 — SMS provider | ✓ Confirmed | Twilio behind `SmsProviderInterface` |
| Decision 9 — Email provider | ✓ Confirmed | Amazon SES via Laravel `ses` mail driver |
