# Architectural Decisions Log

> This file is the authoritative record of all decisions made before and during development.
> If it's not here, it wasn't decided.

---

## Decision 1 — Tenancy Strategy

**Date decided:** 2026-04-07
**Decision:** Option A — Single database, `tenant_id` column on every tenant-scoped table
**Implementation:** Manual Global Scope — `TenantScope` class + `HasTenantScope` trait + `TenantMiddleware`. No `stancl/tenancy` package.
**Rationale:** Simplest approach for MVP scale (hundreds of tenants, not thousands). Avoids package opinions and stancl/tenancy's database-per-tenant defaults. Full control, easier to debug.
**Implications for migrations:** Every tenant-scoped table gets `tenant_id UUID NOT NULL FK → tenants`. Every Eloquent model uses `HasTenantScope` trait.
**Platform admin bypass:** `Order::withoutGlobalScope(TenantScope::class)` — only in platform-admin controllers/services. Never in tenant-facing code.

---

## Decision 2 — SaaS Billing

**Date decided:** 2026-04-07
**Decision:** Manual billing for MVP. Stripe Billing wired up in a later phase.
**Phase 1 scope:** `subscription_plans` table exists with Starter/Growth/Enterprise plans. All `price_monthly = 0` during MVP — all plans are free to use. Feature restrictions enforced by plan tier via `features` JSONB column.
**Stripe Billing:** Deferred — see Decision 7 (payment gateway pending)
**Plan tiers defined:** Yes — Starter, Growth, Enterprise. Feature flags in `subscription_plans.features` JSONB control access per tier.

---

## Decision 3 — Customer Auth Model

**Date decided:** 2026-04-07
**Decision:** Option A — Platform-level customer accounts
**Rationale:** One login across multiple restaurants. Better UX — customer visits two restaurants and has one account with loyalty data per restaurant.
**Impact on customer schema:**
- `customer_profiles` is platform-level (no `tenant_id`) — holds identity + auth only
- New `customer_tenant_profiles` table holds per-tenant loyalty data (points, tier, lifetime spend, visits)
- `UNIQUE (phone)` at platform level (not per-tenant)
- `loyalty_number` is per-tenant (in `customer_tenant_profiles`)
**Impact on React routing:** Customer auth flow: login → restaurant list → select restaurant → tenant-scoped token
**Customer enrolment:** `customer_tenant_profiles` record auto-created when staff enrolls the customer at a restaurant for the first time.

---

## Decision 4 — Dynamic Roles Timing

**Date decided:** 2026-04-07
**Decision:** Option A — Full dynamic role system built in Phase 1
**Rationale:** Build tables + system role seeds + custom role builder UI all upfront. Avoids painful refactor later. Core architecture should be complete from day one.
**Phase 1 scope:** `permissions`, `roles`, `role_permissions`, `user_roles` tables. 8 system roles seeded. Dynamic role builder API + UI shipped in Phase 1.
**Privilege escalation prevention:** Enforced — users can only assign permissions they personally hold.

---

## Decision 5 — Infrastructure Scope

**Date decided:** 2026-04-07
**Decision:** Option B — Docker Compose for application services only. Kubernetes/Helm/Terraform deferred to Phase 3.
**Rationale:** Move fast during active development. Shared infra already available locally. Kubernetes complexity not justified until Phase 3.
**Who owns infra:** Shared infrastructure team provides Postgres+pgbouncer, RabbitMQ, Redis. Application team owns Docker Compose (app services only).

---

## Decision 6 — Repo Structure

**Date decided:** 2026-04-07
**Decision:** 3 separate repos
**Repo structure:**
- `cheflogik` (this repo) — project documentation, CLAUDE.md, decisions.md, docs/, .claude/skills/. Root `.gitignore` ignores `/api` and `/web`.
- `cheflogik-api` — Laravel 12 backend, lives at `/api` locally
- `cheflogik-web` — React 18 frontend, lives at `/web` locally
**CI/CD approach:** Separate pipelines per repo. Deferred to Phase 3.

---

## Decision 7 — Payment Gateway

**Date decided:** PENDING — must be decided before any payment/billing work begins
**Options:** Stripe (specified in docs), alternatives not evaluated
**Blocked work:** `order_payments`, `order_payments` refund flow, `events` deposit collection, Stripe webhook endpoint, `subscription_plans.stripe_price_id`
**Note:** All Stripe-specific columns exist in schema but are nullable until this is confirmed.

---

## Decision 8 — SMS Provider

**Date decided:** PENDING — must be decided before any SMS notification work begins
**Options:** Twilio (specified in docs), alternatives not evaluated
**Blocked work:** Reservation reminders (24h + 2h), customer password reset via OTP, loyalty campaign SMS, GDPR communication
**Note:** Customer password reset ships email-only until this is resolved.

---

## Decision 9 — Email Provider

**Date decided:** PENDING — must be decided before any transactional email work begins
**Options:** SendGrid (specified in docs), alternatives not evaluated
**Blocked work:** Staff password reset email, customer password reset email, booking confirmations, loyalty campaign email

---

## Decision 10 — Queue System

**Date decided:** 2026-04-07
**Decision:** RabbitMQ for all job queues. Redis for cache only.
**Rationale:** Redis loses in-memory queued jobs on restart — unacceptable for critical queue (Stripe webhooks, 86 broadcasts, KDS tickets). RabbitMQ persists messages to disk and provides broker-level acknowledgements. Redis failure = cache miss only, not data loss.
**Package:** `vladimir-yuldashev/laravel-queue-rabbitmq`
**Horizon:** Not used — replaced by RabbitMQ management UI
**Queue priorities:** `critical`, `high`, `default`, `analytics`, `low` — separate queues within the RabbitMQ vhost

---

## Decision 11 — Shared Infrastructure

**Date decided:** 2026-04-07
**Decision:** Use existing shared infrastructure. No Postgres, Redis, or RabbitMQ in Docker Compose.
**Shared services:**
- PostgreSQL 16 with pgbouncer (connection pooling — Laravel connects to pgbouncer, not Postgres directly)
- Redis 7 (cache only)
- RabbitMQ 3 with management UI (queues only)
**Developer setup:** Separate database per developer (`cheflogik_<name>`). Separate RabbitMQ vhost per project. No VPN required — infra is locally accessible.
**Docker Compose services (application only):** `app`, `worker-critical`, `worker-high`, `worker-default`, `worker-background`, `reverb`

---

## Decision 12 — File Storage

**Date decided:** 2026-04-07
**Decision:** AWS S3
**Package:** `league/flysystem-aws-s3-v3`
**Used for:** Menu item photos, staff documents, payroll CSV exports, order receipts, analytics report exports, temperature log exports, GDPR data exports, event run sheet PDFs

---

## Decision 13 — Reverb SSL Termination

**Date decided:** 2026-04-07
**Decision:** Nginx terminates SSL (`wss://`), proxies to Reverb container over plain `ws://` internally
**Local dev:** Plain `ws://localhost:8080` — no SSL needed
**Production:** `wss://` → Nginx (SSL cert) → Reverb container (`ws://reverb:8080`)

---

## Decision 14 — Reverb Channel Authorization

**Date decided:** 2026-04-07
**Decision:** All WebSocket channels are private. Auth endpoint `POST /api/v1/broadcasting/auth` validates:
1. User is authenticated
2. Channel `tenant_id` matches user's `tenant_id`
3. Channel `branch_id` is in user's `branch_ids`
Hard 403 on any mismatch — no silent failure.

---

## Decision 15 — Reverb Scaling

**Date decided:** 2026-04-07
**Decision:** Single Reverb instance for Phase 1 + Phase 2. Horizontal scaling via Redis pub/sub deferred to Phase 3 (Kubernetes).
**Note:** Reverb supports this natively — no architecture changes needed when Phase 3 arrives.

---

## Decision 16 — Logging

**Date decided:** 2026-04-07
**Decision:** AWS CloudWatch for all application logs
**Package:** `maxbanton/cwh` (Monolog CloudWatch handler)
**Log groups:** `/cheflogik/api`, `/cheflogik/worker`, `/cheflogik/reverb`
**Log level:** Production → `error` and above only. Local dev → `daily` file driver (no CloudWatch locally).
**IAM permissions required:** `logs:PutLogEvents`, `logs:CreateLogGroup`, `logs:CreateLogStream`

---

## Decision 17 — Privilege Escalation Prevention

**Date decided:** 2026-04-07
**Decision:** Enforced. Users can only assign permission slugs they personally hold when creating/editing custom roles.
**Implementation:** Validated in `RoleService::validatePermissionEscalation()` before any role is saved.
**Scope:** Branch Managers cannot create roles with permissions beyond their own set. Owners are unrestricted (they hold all permissions).

---

## Decision 18 — Token Expiry

**Date decided:** 2026-04-07
**Decision:**
- Staff tokens: 8-hour expiry + refresh endpoint (`POST /api/v1/auth/refresh`). Aligns with shift-based work patterns.
- Customer tokens: 30-day expiry, revoked on explicit logout.
- Platform admin tokens: No expiry, revoked explicitly only.
**Configuration:** `config/sanctum.php` per guard.

---

## Decision 19 — Customer Auth Flow

**Date decided:** 2026-04-07
**Decision:** After login, customer receives platform-level token. `GET /api/v1/auth/customer/restaurants` returns list of restaurants with `customer_tenant_profiles` records. `POST /api/v1/auth/customer/select` re-scopes the token with selected `tenant_id`.
**First-time enrolment:** `customer_tenant_profiles` record auto-created when a staff member enrolls the customer at a restaurant for the first time.

---

## Decision 20 — Password Reset

**Date decided:** 2026-04-07
**Decision:**
- Staff: Email-based reset only.
- Customers: Choice of email or SMS OTP per `communication_prefs`. SMS implementation deferred until Decision 8 (SMS provider) is resolved. Email-only stub ships first.

---

## Decision 21 — Test Database

**Date decided:** 2026-04-07
**Decision:** Real Postgres for all tests. No SQLite — schema uses ULID, JSONB, partitioned tables, and partial indexes which SQLite does not support.
**Setup:** Two DB credentials per developer on shared infra:
- `cheflogik_<name>` — main development database
- `cheflogik_<name>_test` — test database, reset between test runs via `RefreshDatabase` trait
**phpunit.xml** overrides `DB_DATABASE` to point to the test database.
Both credentials documented in `.env.example`.

---

## Additional Decisions

_Record any architectural decisions made during development here. Date every entry._
