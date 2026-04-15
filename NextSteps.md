# ChefLogik — Next Steps

## Current State
- **306 tests passing**
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

### 5. External Integrations ← NEXT
- **Uber Eats + DoorDash** — real webhook ingestion for platform orders (SyncOrderToPlatformsJob stub already exists)
- **Twilio SMS** — reservation reminders (RemindReservationJob stubs exist) — blocked on Decision 8
- **SendGrid email** — password reset, booking confirmations, welcome emails — blocked on Decision 9

### 6. Kubernetes / Helm Charts
- Kubernetes manifests for app, workers, reverb
- Helm chart with environment-specific values
- See `docs/07-infrastructure.md` for the full spec

---

## Decisions Still Pending (blockers)

| Decision | Blocks |
|---|---|
| Decision 7 — Payment gateway (Stripe not formally confirmed) | Full Stripe payment flow in Orders, refund engine, webhooks |
| Decision 8 — SMS provider (Twilio not confirmed) | Reservation reminders (stubs shipped), customer OTP, loyalty SMS |
| Decision 9 — Email provider (SendGrid not confirmed) | Password reset emails, booking confirmations |
