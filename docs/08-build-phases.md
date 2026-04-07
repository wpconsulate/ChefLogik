# Build Phases

## Phase 1 — Foundation (everything else depends on this)

**Goal:** A working multi-tenant system with orders flowing end-to-end, live dashboard, and Stripe payments. The absolute minimum for a restaurant to actually run.

### Infrastructure setup
- [ ] docker-compose.yml for local dev (Postgres, Redis, Reverb, API, Web)
- [ ] Laravel project scaffolding with directory structure from `docs/02-tech-stack.md`
- [ ] stancl/tenancy configured (confirm strategy in Discussion 1 first)
- [ ] TenantScope global scope on all tenant models
- [ ] TenantMiddleware + tenant resolution from JWT
- [ ] React project scaffolding with TypeScript strict mode + MST + Axios

### Auth system
- [ ] Three Sanctum guards (staff, customer, platform_admin)
- [ ] `permissions` table seeded with all ~80 slugs from `config/permissions.php`
- [ ] `roles` table seeded with 8 system roles
- [ ] `role_permissions` pivot seeded (system role defaults)
- [ ] JWT token with permissions array resolved + cached in Redis
- [ ] Gate registration using cached permissions
- [ ] TenantMiddleware + PermissionMiddleware chain
- [ ] Login / logout / me endpoints
- [ ] AuthStore (MST) + PermissionGate component

### Branch & Staff Management
- [ ] Tenant + branch CRUD endpoints
- [ ] Staff CRUD + role assignment
- [ ] `user_roles` with branch_ids scoping
- [ ] Branch switcher in React (sets X-Branch-Id header)

### Menu Management
- [ ] Menu categories + items CRUD
- [ ] Branch override CRUD
- [ ] 86 / restore endpoints with dual trigger types (manual + inventory)
- [ ] MenuStore (MST) + menu management pages

### Orders & Deliveries
- [ ] All 7 channel ingestion + normalisation pipeline
- [ ] 9-stage lifecycle with status transitions
- [ ] Stock deduction event (OrderConfirmed → DeductStockJob)
- [ ] Stripe Terminal + Stripe Payments integration
- [ ] Stripe webhook endpoint (signature verified, idempotent)
- [ ] Basic cancellation (pre-prep = full refund)
- [ ] Refund engine (Stripe Refunds API)
- [ ] Laravel Reverb setup + order status WebSocket broadcasts
- [ ] OrderStore (MST) + live order Kanban dashboard

### Acceptance criteria for Phase 1
- A manager can log in, see only their tenant's data, create a branch, add staff with roles
- A dine-in order can be placed, confirmed, tracked through all 9 stages, and paid via Stripe
- An Uber Eats order arrives via webhook, appears on the dashboard, and can be accepted
- 86-ing an item broadcasts via WebSocket within 5 seconds to all connected clients
- Tenant A cannot see Tenant B's orders, staff, or menu data (tested with automated tests)

---

## Phase 2 — Core Modules

**Goal:** All operational modules working. A restaurant can fully run day-to-day.

### Table & Reservation Management
- [ ] Floor plan CRUD + table state machine (5 states)
- [ ] Reservation lifecycle (confirmed → arrived → seated → completed / no-show / cancelled)
- [ ] Availability algorithm (respects special operating hours)
- [ ] Walk-in profile matching (500ms SLA)
- [ ] Waitlist management + ETA calculation
- [ ] 24h and 2h SMS reminders (queued)
- [ ] Table state WebSocket broadcasts
- [ ] ReservationStore + floor plan UI

### Customer Profiles & Loyalty
- [ ] Profile auto-creation on booking / walk-in / enrolment
- [ ] Deduplication (E.164 phone as primary key)
- [ ] Delivery platform profile matching
- [ ] Bronze/Silver/Gold tier structure + weekly recalculation job
- [ ] Points earn on settled orders (atomic loyalty transactions)
- [ ] Points redemption at POS
- [ ] GDPR: consent storage, right to access export, right to erasure
- [ ] Birthday recognition campaigns
- [ ] CustomerStore + basic loyalty UI

### Inventory & Kitchen
- [ ] Inventory items CRUD with WAC tracking
- [ ] Recipe CRUD (Draft/Pending/Approved states)
- [ ] GRN with temperature logging + WAC recalculation
- [ ] Waste logging (6 types)
- [ ] Stocktake workflow
- [ ] KDS WebSocket channel + allergen acknowledgement (30s SLA, hard gate)
- [ ] Inventory-linked 86 auto-trigger on zero stock
- [ ] InventoryStore + KDS page

### Events & Functions
- [ ] 5-phase event lifecycle state machine
- [ ] Enquiry pipeline → proposal → deposit (Stripe) → confirmed
- [ ] Event packages + corporate accounts
- [ ] Pre-event planning tasks
- [ ] Run sheet generation
- [ ] Recurring event parent/child model
- [ ] Post-event billing + invoice generation
- [ ] EventStore + events management pages

### SaaS onboarding
- [ ] Tenant signup flow (create tenant + first branch + owner account)
- [ ] Subscription plan selection (if billing decided in Discussion 2)
- [ ] Platform admin panel (list/manage tenants)

### Acceptance criteria for Phase 2
- Full reservation lifecycle works end-to-end including SMS reminders
- A customer profile is created on first booking; loyalty points awarded on settlement
- A stocktake correctly calculates WAC and flags variance
- An event goes from enquiry to post-event invoice with deposit collected via Stripe
- KDS allergen acknowledgement gate prevents item from being marked ready until acknowledged

---

## Phase 3 — Intelligence and Platform

**Goal:** Analytics working, loyalty campaigns, external integrations live, dynamic roles UI, customer portal.

### Analytics & Reporting
- [ ] Hourly aggregation jobs (Horizon)
- [ ] Daily aggregation jobs (scheduler)
- [ ] Weekly RFM recalculation job
- [ ] Monthly CLV + tier recalculation job
- [ ] 5 role-appropriate dashboards
- [ ] Menu engineering matrix (Stars/Plowhorses/Puzzles/Dogs)
- [ ] Churn risk detection + churn risk list
- [ ] PDF export (dompdf/browsershot) + CSV export
- [ ] Scheduled report delivery (SendGrid)
- [ ] Tax/VAT reporting
- [ ] Financial period close
- [ ] Audit log viewer

### Dynamic role builder UI
- [ ] Role management pages (list, create, edit, delete custom roles)
- [ ] Permission group UI (grouped by module with toggle switches)
- [ ] Role assignment to staff members

### External integrations (production)
- [ ] Uber Eats: full menu sync + order management + store status
- [ ] DoorDash: same as Uber Eats
- [ ] Twilio: SMS delivery + STOP opt-out sync
- [ ] SendGrid: email templates + unsubscribe management
- [ ] Platform throttle (pause delivery platforms from dashboard)

### Customer portal
- [ ] Customer login/registration
- [ ] Loyalty balance + tier + progress display
- [ ] Booking history
- [ ] GDPR self-service (view data, request deletion)
- [ ] Communication preference management

### Kubernetes production deployment
- [ ] Helm charts for all services
- [ ] Horizontal Pod Autoscaler configs
- [ ] Terraform for cloud resources
- [ ] CI/CD pipeline (GitHub Actions or equivalent)
- [ ] Staging environment

### Acceptance criteria for Phase 3
- All 5 dashboards display accurate data based on test fixtures
- RFM segments correctly classify test customers into all 8 segments
- A scheduled weekly report is delivered via email at the configured time
- Uber Eats webhook order appears on dashboard within 2 seconds
- Dynamic custom role can be created, assigned to a staff member, and permission changes take effect within 5 minutes
