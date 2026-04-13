# ChefLogik — Next Steps

## Current State
- **118 tests passing**
- **Phase 1 Foundation: COMPLETE** ✓
- **Phase 2, Module 1 — Table & Reservation Management: COMPLETE** ✓
- Phase 2 remaining modules: not started

---

## Phase 1 — COMPLETE ✓

All Phase 1 deliverables are done and tested.

---

## Phase 2 — In Progress

### ✓ 1. Table & Reservation Management — DONE
Floor plans, tables (state machine), reservations (lifecycle), availability algorithm, waitlist, walk-in matching.
24 tests passing.

---

### 2. Customer Profiles & Loyalty ← START HERE

Customer deduplication across channels, loyalty points earn/redeem, basic tier management.
Depends on: Orders (points issued on `completed` transition — `IssueLoyaltyPointsJob` already stubbed).

**What it achieves:** A single customer identity across dine-in, takeaway, and delivery. Restaurants can reward repeat customers and run targeted promotions.

**Scope:**
- Customer signup + login (platform-level, no `tenant_id` on profile)
- Per-tenant customer profile (`customer_tenant_profiles`): loyalty points, tier, visit history
- Points earn on order `completed` (wire up `IssueLoyaltyPointsJob` with real logic)
- Points redeem at order creation
- Basic tier progression (Bronze / Silver / Gold based on spend)
- Customer portal endpoints (auth:customer guard)

**Key files:**
- `docs/modules/customers.md` — full requirements
- `.claude/skills/customers.md` — implementation patterns
- `app/Models/CustomerProfile.php` — already exists (platform-level)
- `app/Models/CustomerTenantProfile.php` — already exists
- `app/Jobs/Orders/IssueLoyaltyPointsJob.php` — already stubbed, needs real impl

---

### 3. Inventory & Kitchen

Stock management, WAC costing, KDS ticket flow, waste logging.
Depends on: Orders (`DeductStockJob` already stubbed, needs real implementation).

**What it achieves:** Kitchen Display System for order tickets, stock tracking to prevent overselling, food cost visibility for managers.

**Scope:**
- Stock items + recipes (menu item → stock item mappings)
- WAC (Weighted Average Cost) recalculation on GRN receipt
- KDS ticket creation on `OrderConfirmed`; acknowledgement with allergen check (30s rule)
- 86 auto-trigger on stockout (wires back into existing 86 system)
- Waste log
- Purchase orders + GRN receipt flow

---

### 4. Events & Functions

Enquiry pipeline, event packages, deposits, event-specific menus.

**What it achieves:** Restaurants can manage private events and functions — from initial enquiry through contract, deposit, event execution, and post-event billing.

**Scope:**
- Event enquiry creation and pipeline (enquiry → proposal → confirmed → completed)
- Event packages with pricing
- Deposit management (stub — Stripe Payment blocked on Decision 7)
- Event-specific menus
- Corporate client management

---

### 5. SaaS Tenant Onboarding

Self-service signup, plan selection, branch setup wizard.
Depends on: All Phase 1 modules working end-to-end.

**What it achieves:** New restaurants can sign up without manual provisioning. Owner creates account, picks plan, sets up their first branch, and is ready to take orders.

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
| Decision 8 — SMS provider (Twilio not confirmed) | Reservation reminders (stubs shipped), customer OTP, loyalty SMS |
| Decision 9 — Email provider (SendGrid not confirmed) | Password reset emails, booking confirmations |
