# ChefLogik — Next Steps

## Current State
- 65 tests passing
- Phase 1 Foundation: ~80% complete
- Phase 2 modules: not started

---

## Phase 1 — Remaining (do these first)

### 1. Orders & Deliveries ← START HERE
**Why:** Everything else in Phase 1 (Reverb, KDS, loyalty) depends on orders existing.

**What it achieves:** The core revenue-generating flow. Staff can receive, manage, and fulfil orders across all 7 channels. Kitchen gets tickets. Customers get receipts.

**Scope:**
- 7 order channels: `dine_in_pos`, `dine_in_qr`, `takeaway_counter`, `takeaway_phone`, `online`, `uber_eats`, `doordash`
- 9-stage lifecycle: `new → confirmed → preparing → ready → out_for_delivery → delivered → served → bill_settled → completed` (+ `cancelled`)
- Order items with modifier selections, special instructions, allergen flags
- Status transition engine — validates allowed transitions, logs every change with actor + timestamp
- Stock deduction on `confirmed` (fires `OrderConfirmed` event → `DeductStockJob` on `critical` queue)
- Payment flow: Stripe PaymentIntent server-side, webhook confirms (no polling)
  - **Note:** Blocked on Decision 7 (Stripe not yet formally confirmed). Implement as stub with `payment_status` field — wire Stripe later.
- Cancellation engine: customer-initiated / restaurant-initiated / delivery-failure → `RefundEngine` service
- Delivery zones per branch (radius/polygon, min order value, delivery fee, transit time)
- Platform sync stubs (Uber Eats, DoorDash — same pattern as menu 86 sync jobs)
- Broadcast events via Reverb: `OrderStatusChanged`, `NewOrderReceived`, `OrderModified`

**Key models:** `Order`, `OrderItem`, `OrderStatusLog`, `OrderPayment`, `DeliveryZone`
**Key services:** `OrderService`, `OrderStatusService`, `RefundEngine`, `DeliveryZoneService`
**Key jobs:** `DeductStockJob` (critical queue), `SyncOrderToPlatformsJob` (high queue)
**Key events:** `OrderConfirmed`, `OrderStatusChanged`, `OrderCancelled`

---

### 2. Laravel Reverb — WebSocket Setup
**Why:** Orders broadcasts (above) need Reverb running. Also needed for KDS in Phase 2.

**What it achieves:** Real-time order dashboard. Staff see new orders arrive and status changes without polling.

**Scope:**
- Configure Reverb in `config/reverb.php` and `config/broadcasting.php`
- Channel definitions: `tenant.{tenantId}.branch.{branchId}.orders` (private)
- Broadcast `OrderStatusChanged` and `NewOrderReceived` on order transitions
- Docker Compose service already planned — just needs the Laravel side wired up

---

## Phase 2 — After Phase 1 is Complete

### 3. Table & Reservation Management
Covers floor plans, table status, walk-ins, online bookings, waitlist management.

### 4. Customer Profiles & Loyalty
Customer deduplication across channels, loyalty points earn/redeem, basic tier management.
Depends on: Orders (points issued on `completed` transition).

### 5. Inventory & Kitchen
Stock management, WAC costing, KDS ticket flow, waste logging.
Depends on: Orders (stock deductions wired from OrderConfirmed).

### 6. Events & Functions
Enquiry pipeline, event packages, deposits, event-specific menus.

### 7. SaaS Tenant Onboarding
Self-service signup, plan selection, branch setup wizard.
Depends on: All Phase 1 modules working end-to-end.

---

## Phase 3 — Intelligence & Platform (later)

- Analytics dashboards (5 dashboards, pre-aggregation jobs, RFM, CLV, churn risk)
- Dynamic role builder UI
- Customer portal (loyalty dashboard, GDPR self-service)
- Platform admin panel (full tenant + subscription management)
- External integrations (Uber Eats, DoorDash, Twilio, SendGrid — real API calls)
- Kubernetes manifests + Helm charts

---

## Decisions Still Pending (blockers)

| Decision | Blocks |
|---|---|
| Decision 7 — Payment gateway (Stripe not formally confirmed) | Full Stripe payment flow in Orders, refund engine, webhooks |
| Decision 8 — SMS provider (Twilio not confirmed) | Reservation reminders, customer OTP, loyalty SMS |
| Decision 9 — Email provider (SendGrid not confirmed) | Password reset emails, booking confirmations |
