# ChefLogik — Next Steps

## Current State
- **349 tests passing**
- **Phase 1 Foundation: COMPLETE** ✓
- **Phase 2 — ALL MODULES COMPLETE** ✓
  - Module 1 — Table & Reservation Management ✓
  - Module 2 — Customer Profiles & Loyalty ✓
  - Module 3 — Inventory & Kitchen ✓
  - Module 4 — Events & Functions ✓
  - Module 5 — SaaS Tenant Onboarding ✓
- **Phase 3 — In Progress**
  - Module 1 — Analytics & Reporting ✓
  - Module 2 — Dynamic Role Builder ✓
  - Module 3 — Customer Portal Additions ✓
  - Module 4 — Platform Admin Panel Enhancements ✓
  - Module 5 — Settings / Configuration ✓

---

## Phase 1 — COMPLETE ✓

All Phase 1 deliverables are done and tested.

---

## Phase 2 — In Progress

### ✓ 1. Table & Reservation Management — DONE
Floor plans, tables (state machine), reservations (lifecycle), availability algorithm, waitlist, walk-in matching.
24 tests passing.

### ✓ 2. Customer Profiles & Loyalty — DONE
Customer registration, staff enrollment, loyalty points (earn/redeem/adjust), tier progression, GDPR erasure.
38 tests passing.

---

### ✓ 3. Inventory & Kitchen — DONE
Stock items + recipes, WAC costing, KDS ticket flow, DeductStockJob, auto-86 on stockout, waste logging, GRN receipt, purchase orders, stocktakes.
47 tests passing.

---

### ✓ 4. Events & Functions — DONE
Event spaces, packages, corporate accounts (credit check), enquiry pipeline (enquiry → proposal → confirmed → pre_event → day_of → completed), pre-event task auto-generation, run sheet, deposit stub (Stripe pending Decision 7).
29 tests passing.

---

### ✓ 5. SaaS Tenant Onboarding — DONE
Self-service signup (public API), plan listing, slug availability check, branch setup wizard, onboarding status tracking.
17 tests passing.

---

## Phase 3 — Intelligence & Platform

### ✓ 1. Analytics & Reporting — DONE
5 dashboards (owner, branch, kitchen, events, customer), 4 pre-aggregation jobs (daily revenue, hourly snapshot, RFM segments, dish performance), RFM scoring, CLV, churn risk.
17 tests passing.

---

### ✓ 3. Customer Portal Additions — DONE
Reservation history (list + show, with `?upcoming` and `?status` filters), event booking history (list + show, with `?upcoming` filter). Both enforce ownership — customers can only see their own records. Requires tenant-scoped customer token.
12 tests passing (CustomerPortalBookingHistoryTest).

---

### ✓ 2. Dynamic Role Builder — DONE
Role CRUD (list/create/update/delete), permission listing grouped by module, role assignment/revocation on staff members, privilege escalation guard, system-role protection, last-role guard.
11 new tests passing (RoleAssignmentTest).

Also fixed: `UserRole.branch_ids` now uses a `PostgresUuidArray` cast (correctly serializes PHP arrays to `{uuid1,uuid2}` format for PostgreSQL native UUID[] columns; the previous `'array'` cast silently broke for non-null branch_ids).

### ✓ 4. Platform Admin Panel Enhancements — DONE
Tenant usage stats, impersonation (1-hour owner token, idempotent, audit logged), suspend/reactivate with audit trail, subscription plan listing.
`AuditLogger` service created — reusable write-only audit log writer across the codebase.
17 tests passing (PlatformAdminPanelTest).

### ✓ 5. Settings / Configuration — DONE
Hierarchical role-gated settings (cascade: branch → tenant → platform → default), permission delegation, 30 configurable keys across 7 groups. Hardcoded constants replaced in LoyaltyService, AvailabilityService, OrderService.
45 tests passing.

### 6. External Integrations ← NEXT

All three provider decisions are now locked (see `decisions.md`).

#### 6a. Payment — Stripe ← START HERE
- `app/Contracts/PaymentGatewayInterface.php` — contract
- `app/Services/Payments/StripePaymentGateway.php` — Stripe implementation
- `config/payment.php` — driver config
- Full order payment flow: PaymentIntent creation, webhook ingestion, refund engine
- Events deposit collection
- `order_payments` table fully wired

#### 6b. SMS — Twilio (plugin architecture)
- `app/Contracts/SmsProviderInterface.php` — contract
- `app/Services/Sms/TwilioSmsProvider.php` — Twilio implementation
- `config/sms.php` — driver config
- Reservation reminders (24h + 2h jobs — stubs exist, need real send)
- Customer OTP password reset
- Loyalty campaign SMS dispatch

#### 6c. Email — Amazon SES
- `MAIL_MAILER=ses` — uses existing AWS credentials (no new package)
- Laravel Mailables: `WelcomeEmail`, `StaffPasswordResetEmail`, `CustomerPasswordResetEmail`, `BookingConfirmationEmail`
- Loyalty campaign email dispatch
- Wire the tenant welcome email stub in `TenantProvisioningService`

#### 6d. Uber Eats + DoorDash (after payments)
- Real webhook ingestion for platform orders
- `SyncOrderToPlatformsJob` stub already exists

### 7. Kubernetes / Helm Charts
- Kubernetes manifests for app, workers, reverb
- Helm chart with environment-specific values
- See `docs/07-infrastructure.md` for the full spec

---

## Module Gaps — From Full Audit (2026-04-18)

These gaps were identified by comparing all `docs/modules/` specs against the implementation.
Items blocked by pending decisions (Stripe, SMS, Email) are now unblocked.

### Orders
- [ ] **Stripe PaymentIntent creation + webhook handler** — PaymentIntent server-side creation, `PaymentIntent.succeeded` webhook, signature verification, idempotency. *(Unblocked — Decision 7 confirmed)*
- [ ] Pre-paid online orders auto-confirmation after successful PaymentIntent
- [ ] Delivery platform 5-min auto-confirmation SLA job
- [ ] `SyncOrderToPlatformsJob` stub → real Uber Eats / DoorDash API calls *(Phase 3)*
- [ ] Stock restoration on pre-preparation cancellations

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
- [ ] **Stripe deposit collection** — PaymentIntent for event deposits *(Unblocked — Decision 7 confirmed)*
- [ ] Non-refundable booking fee policy per occasion type
- [ ] Credit limit enforcement — block new bookings for over-limit net-30 corporate accounts
- [ ] Run sheet PDF export
- [ ] Overdue pre-event task alerts via Reverb + push notification
- [ ] Minimum spend charge prompt at bill close

### Inventory
- [ ] KDS station assignment — items currently all default to Pass station; need dynamic routing (grill / fryer / cold / pass)
- [ ] Temperature log export (PDF/CSV for environmental health inspection)
- [ ] Manager alert when an order contains items whose only recipe is in `draft` status

### Customers & Loyalty
- [ ] Event booking 2× loyalty multiplier — link event confirmation to `LoyaltyService`
- [ ] 30-day downgrade grace period warning before tier downgrade
- [ ] Points expiry warning notification at 12-month inactivity mark
- [ ] Manual profile merge endpoint (currently raises `DuplicateProfileException` but no merge action)

### Analytics
- [ ] CLV formula: `avg_spend_per_visit × avg_visits_per_year × estimated_lifespan_years` — field exists but formula not coded
- [ ] COGS calculation: `opening_stock + purchases - closing_stock`
- [ ] Tax collected report endpoint (net_sales, tax_rate, tax_amount per category per period)
- [ ] RevPASH calculation respects special operating hours for affected dates

### Staff
- [ ] Document expiry alert job — notify 30 days before driving licence / food hygiene / right-to-work expiry
- [ ] Staff push notification when Branch Manager publishes the weekly schedule

### Cross-module / Notifications (blocked by Decisions 8 & 9)
- [ ] Reservation reminder SMS (24h + 2h — jobs exist, send is stubbed) *(Unblocked — Decision 8 confirmed)*
- [ ] Customer OTP / password reset SMS *(Unblocked — Decision 8 confirmed)*
- [ ] Loyalty campaign SMS dispatch *(Unblocked — Decision 8 confirmed)*
- [ ] Booking confirmation email *(Unblocked — Decision 9 confirmed)*
- [ ] Staff / customer password reset email *(Unblocked — Decision 9 confirmed)*
- [ ] Tenant welcome email in `TenantProvisioningService` *(Unblocked — Decision 9 confirmed)*

---

## Decisions — All Locked ✓

| Decision | Status | Choice |
|---|---|---|
| Decision 7 — Payment gateway | ✓ CONFIRMED | Stripe behind `PaymentGatewayInterface` plugin |
| Decision 8 — SMS provider | ✓ CONFIRMED | Twilio behind `SmsProviderInterface` plugin |
| Decision 9 — Email provider | ✓ CONFIRMED | Amazon SES via Laravel `ses` mail driver |
