# Restaurant Management SaaS — Claude Code Master Guide

> **READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.**
> The mandatory discussion checklist in Section 2 must be completed first.
> Document every decision in `decisions.md` before proceeding.

---

## 1. Project Overview

A multi-tenant SaaS restaurant management platform. Restaurant businesses (tenants) subscribe to the platform and manage their operations — orders, menus, reservations, events, inventory, staff, customers, and analytics — across one or more branches.

**This is not a single-restaurant app.** Every piece of data belongs to a tenant. Every query must be tenant-scoped. Every JWT carries a `tenant_id`. Leaking cross-tenant data is a critical security failure.

### Scale targets
- Tenants: hundreds of restaurant businesses
- Branches per tenant: 1–3 (MVP), unlimited (future)
- Concurrent users per tenant: up to 50 staff + N customers
- Orders per tenant per day: up to 500

### What exists already
All requirements have been fully documented across 12 requirement documents. The system has been designed end-to-end. Claude Code's job is to implement what is specified — not to redesign it. When in doubt, read the relevant docs file before writing code.

---

## 2. MANDATORY PRE-CODE DISCUSSION CHECKLIST

**Do not scaffold, do not create migrations, do not write any application code until all 6 discussions below are completed and documented in `decisions.md`.**

Raise each topic with the developer. Record the decision. Then proceed.

### Discussion 1 — Tenancy strategy ⚠️ MOST CRITICAL
Three options exist:
- **Option A** (recommended MVP): Single database, `tenant_id` column on every table, Laravel Global Scope on every Eloquent model. Use `stancl/tenancy` v3 in single-db mode, or implement manually.
- **Option B**: Schema-per-tenant in Postgres (each tenant gets their own Postgres schema). Better isolation. More complex migrations. `stancl/tenancy` supports this.
- **Option C**: Database-per-tenant. Maximum isolation. Complex Kubernetes ops. Not recommended for MVP.

**Questions to confirm:**
- Which option?
- If Option A: will we use `stancl/tenancy` package or a manual Global Scope implementation?
- How do we handle the platform-admin queries that must bypass tenant scoping?

### Discussion 2 — SaaS billing and subscription plans
The platform needs to bill tenants. Options:
- Stripe Billing with subscription plans (Starter/Growth/Enterprise)
- Manual invoicing for MVP, Stripe Billing later
- Should plan tier restrict features (e.g. Starter = analytics read-only, Growth = full analytics)?
- Does a `subscription_plans` table exist in Phase 1 or is it added later?

### Discussion 3 — Customer auth model ⚠️ UNRESOLVED
**This is an open architectural question — resolve with developer before building the customer auth guard.**

Option A: Customers have one platform-level account. They log in once and can see loyalty balances across multiple restaurants they've visited. Cross-tenant customer data must be handled with extreme care.

Option B: Each tenant has its own customer auth. A customer who visits two restaurants has two separate accounts. Simpler isolation, but worse UX.

This decision affects the customer auth guard, the customer profile schema, JWT scoping for customers, and the React routing for the customer-facing portal.

### Discussion 4 — Dynamic roles implementation timing
System roles (Owner, Branch Manager, etc.) are pre-seeded and always available. Dynamic custom roles (tenant creates additional roles with custom permissions) are in scope.

**Question:** Build the dynamic role builder in Phase 1 alongside the base auth system, or seed system roles as static data in Phase 1 and add the dynamic builder in Phase 2?

Recommendation: Build the `permissions`, `roles`, and `role_permissions` tables from day one (avoids a painful refactor), but expose the UI for creating custom roles in Phase 2.

### Discussion 5 — Kubernetes/infrastructure scope
**Question:** What does Claude Code scaffold for infrastructure?
- Option A: Full Terraform + Helm charts + Kubernetes manifests as a parallel workstream
- Option B: `docker-compose.yml` for local development + application code only. Infrastructure is handled separately.
- Option C: Dockerfile per service + a basic Helm chart skeleton, but no Terraform

See `docs/07-infrastructure.md` for the intended Kubernetes architecture.

### Discussion 6 — Monorepo vs separate repos
**Question:** Single monorepo (Laravel API + React frontend in one repo) or two separate repos?

Given Kubernetes + Helm with separate Docker images, two repos is the more natural choice. But a monorepo with separate `api/` and `web/` directories simplifies cross-cutting changes during active development.

Confirm before `git init`.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Laravel 12, PHP 8.3 |
| Database | PostgreSQL 16 |
| Cache / queues | Redis 7 |
| Real-time | Laravel Reverb (self-hosted WebSocket) |
| Frontend framework | React 18, TypeScript (strict mode) |
| Frontend state | MobX-State-Tree (MST) |
| Auth | Laravel Sanctum (multiple guards) |
| Payments | Stripe (Payments, Terminal, Webhooks, Refunds) |
| Delivery platforms | Uber Eats API, DoorDash API |
| SMS | Twilio |
| Email | SendGrid |
| Queue driver | Redis (Laravel Horizon) |
| Storage | S3-compatible (photos, exports, receipts) |
| Container | Docker |
| Orchestration | Kubernetes + Helm |
| Infrastructure as code | Terraform |
| Package (tenancy) | stancl/tenancy v3 (confirm in Discussion 1) |

**See `docs/02-tech-stack.md` for full conventions, folder structure, and coding standards.**

---

## 4. Navigation Guide — Read These Files

### Before writing any code
1. This file (`CLAUDE.md`) — complete the discussion checklist
2. `decisions.md` — document every decision
3. `docs/01-project-overview.md` — business context and non-negotiable rules
4. `docs/02-tech-stack.md` — Laravel/React conventions and folder structure
5. `docs/03-database-schema.md` — all tables, columns, indexes

### When working on authentication/permissions
- `docs/05-auth-roles.md` — three guards, JWT structure, dynamic roles, Gate/Policy pattern
- `docs/05-access-control.svg` — permission resolution flow diagram
- `.claude/skills/tenancy.md` — tenant isolation patterns
- `.claude/skills/auth-permissions.md` — permission checking patterns

### When working on the database / migrations
- `docs/03-database-schema.md` — authoritative schema
- `docs/03-database-erd.svg` — entity relationships visual

### When working on a specific module
Load the module's skill file and requirement doc:
```
@.claude/skills/orders.md          → when implementing orders
@docs/modules/orders.md            → full requirements reference

@.claude/skills/menu.md            → when implementing menu
@docs/modules/menu.md

@.claude/skills/reservations.md
@docs/modules/reservations.md

@.claude/skills/events.md
@docs/modules/events.md

@.claude/skills/inventory.md
@docs/modules/inventory.md

@.claude/skills/customers.md
@docs/modules/customers.md

@.claude/skills/analytics.md
@docs/modules/analytics.md
```

### When working on external integrations
- `docs/10-integrations.md` — all external API specs
- `.claude/skills/integrations.md`

### When working on the frontend
- `docs/06-frontend-architecture.md` — React + MST conventions
- `docs/06-frontend-store-map.svg` — MST store tree
- `.claude/skills/frontend-mst.md`

### When working on infrastructure
- `docs/07-infrastructure.md` — Kubernetes, Helm, Terraform plan
- `.claude/skills/kubernetes.md`

### Cross-cutting rules (read when anything touches multiple modules)
- `docs/09-cross-module-rules.md` — 86 propagation, WAC authority, tenant isolation, notifications, audit log

---

## 5. Critical Rules — Never Violate These

### Tenant isolation
1. Every Eloquent model that holds tenant data MUST have a `TenantScope` global scope applied.
2. Never write a query without tenant scoping unless you are in a platform-admin context with explicit `withoutGlobalScope(TenantScope::class)`.
3. Test tenant isolation on every new model: create data for Tenant A, assert Tenant B cannot retrieve it.

### Permissions
1. All permission checks use `Gate::check('permission.slug')` or `$this->authorize('permission.slug')` — never check `$user->role === 'branch_manager'` directly.
2. Permission resolution is cached in Redis (key: `perms:{tenant_id}:{user_id}`, TTL 5 min). Invalidate on role change.
3. UI permission gating is UX only. The API always re-validates.

### Payments and card data
1. No raw card numbers, CVV, or magnetic stripe data ever enter the application.
2. All payments via Stripe. No other payment processor.
3. Stripe webhook endpoints verify signature before any business logic runs.
4. All refunds via Stripe Refunds API against the original PaymentIntent.

### Food safety
1. Inventory-linked 86 events (triggered by stockout) NEVER auto-restore. Manual manager confirmation required every time.
2. Allergen notes on KDS tickets must be acknowledged within 30 seconds. The acknowledgement is logged and immutable.

### Audit trail
1. The audit log is write-only. No update or delete operations on `audit_log` records, ever.
2. All audit entries include: `tenant_id`, `actor_id`, `actor_role`, `action`, `resource_type`, `resource_id`, `changes` (JSON), `ip_address`, `created_at`.

### Data retention
1. Financial records (orders, payments, refunds, invoices): 7 years minimum.
2. Customer PII: anonymised on erasure request, financial history retained anonymised.
3. Audit logs: 7 years minimum.

---

## 6. Build Phases

**See `docs/08-build-phases.md` for the detailed per-module phase breakdown.**

### Phase 1 — Foundation (build first, everything else depends on it)
- Tenancy infrastructure (tenant model, Global Scope, middleware)
- Auth system (three guards, JWT, permissions table, system roles seeded)
- Branch & Staff Management (branch CRUD, staff CRUD, role assignment)
- Menu Management (master menu, branch overrides, 86 management)
- Orders & Deliveries (all 7 channels, 9-stage lifecycle, Stripe payments, basic cancellations)
- Laravel Reverb setup (WebSocket for live order dashboard)
- Docker Compose for local development

### Phase 2 — Core modules
- Table & Reservation Management
- Customer Profiles & Loyalty (profile creation, deduplication, basic loyalty earn/redeem)
- Inventory & Kitchen (stock management, KDS, waste logging, WAC costing)
- Events & Functions (enquiry pipeline through billing)
- SaaS tenant onboarding flow (signup, plan selection, branch setup wizard)

### Phase 3 — Intelligence and platform
- Analytics & Reporting (pre-aggregation jobs, 5 dashboards, RFM, CLV, churn risk)
- Dynamic role builder UI (the permissions/roles tables are already there from Phase 1)
- Customer portal (loyalty dashboard, booking history, GDPR self-service)
- Platform admin panel (tenant management, subscription management)
- External integrations (Uber Eats, DoorDash, Twilio, SendGrid)
- Kubernetes manifests and Helm charts

---

## 7. Coding Standards Summary

**Laravel (backend)**
- PHP 8.3 — use readonly properties, enums, fibers where appropriate
- Strict types declaration on every file: `declare(strict_types=1);`
- Repository pattern for data access (no fat controllers)
- Service classes for business logic (no business logic in models or controllers)
- Form Request classes for all validation
- API Resources for all JSON responses (no `->toArray()` in controllers)
- Events + Listeners for cross-module side effects (order confirmed → deduct stock)
- Queue jobs for all async work (platform sync, email/SMS, aggregation)
- Enums for all status fields (OrderStatus, TableStatus, LoyaltyTier, etc.)
- PHPDoc blocks on all public methods
- Feature tests for all API endpoints; unit tests for all service classes

**React (frontend)**
- TypeScript strict mode (`"strict": true` in tsconfig)
- MST models for all server state (never useState for server data)
- React Query is NOT used — MST handles all data fetching and caching
- Functional components only — no class components
- Props typed with TypeScript interfaces — no `any`
- `authStore.can('permission.slug')` before rendering any privileged UI
- API calls go through the typed `ApiService` class — no direct `fetch` in components

**Full standards in `docs/02-tech-stack.md`.**
