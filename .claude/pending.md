# Pending Work — Module Gap Analysis

> Last reviewed: 2026-05-01

---

## ✅ DONE — Category 1: Decision 22 (Wolt) Bug Fixes

All DoorDash references have been replaced:

| File | Fix |
|---|---|
| `api/app/Services/Customers/LoyaltyService.php` | `OrderSource::DoorDash` → `OrderSource::Wolt` (line 49 + PHPDoc line 44) |
| `api/tests/Feature/Orders/OrderGapsTest.php` | `OrderSource::DoorDash` → `OrderSource::Wolt` (line 208) |
| `api/app/Enums/OrderActorType.php` | Comment updated: "Uber Eats / Wolt" |
| `api/app/Jobs/Orders/IssueLoyaltyPointsJob.php` | Comment updated: "Uber Eats / Wolt" |
| `api/app/Services/Orders/OrderStatusService.php` | Comment updated: "Uber Eats / Wolt" |

---

## ✅ DONE — Category 2: Analytics Scheduling

All 4 aggregation jobs now wired into `api/routes/console.php`:

| Job | Schedule |
|---|---|
| `AggregateHourlySnapshotJob` | Every hour — fans out per active tenant |
| `AggregateDailyRevenueJob` | Daily 02:00 — fans out per active tenant |
| `CalculateDishPerformanceJob` | Daily 02:00 — fans out per active tenant |
| `RecalculateRfmSegmentsJob` | Weekly Monday 03:10 — fans out per active tenant |

Monthly additions also added:
- `ApplyLoyaltyTierDowngradesJob` — 1st of month 03:00
- Monthly CLV refresh (re-runs `RecalculateRfmSegmentsJob`) — 1st of month 03:10
- `SendScheduledReportsCommand` — daily 07:00

---

## ✅ DONE — Category 3A: Monthly CLV + Tier Recalculation

**New files:**
- `api/database/migrations/2026_05_01_000001_add_tier_downgrade_fields_to_customer_tenant_profiles.php`
  — adds `tier_pending_downgrade` + `tier_downgrade_scheduled_at` columns
- `api/app/Jobs/Customers/ApplyLoyaltyTierDowngradesJob.php`
  — applies pending downgrades past their 30-day grace period

**Modified files:**
- `api/app/Enums/LoyaltyTier.php` — added `rank()` method for correct tier ordering
- `api/app/Models/CustomerTenantProfile.php` — added new columns to `$fillable` and `$casts`
- `api/app/Jobs/Customers/RecalculateLoyaltyTiersJob.php` — upgrades applied immediately; downgrades now schedule 30-day grace instead of applying

**Tests:** `api/tests/Feature/Customers/LoyaltyTierDowngradeTest.php` — 7 tests, all passing ✅

---

## ✅ DONE — Category 3B: Scheduled Report Delivery (Amazon SES)

**New files:**
- `api/app/Console/Commands/SendScheduledReportsCommand.php`
  — reads `reporting.scheduled_reports` tenant setting, dispatches `SendScheduledReportJob` for due reports
- `api/app/Jobs/Analytics/SendScheduledReportJob.php`
  — generates export, uploads to S3, emails recipients with 24h download link
- `api/app/Mail/ScheduledReportMail.php`
- `api/resources/views/mail/scheduled-report.blade.php`
- `api/config/settings.php` — added `reporting.scheduled_reports` key (type: array, scope: tenant)

**Test:** `api/tests/Feature/Analytics/ScheduledReportTest.php` — 5 tests, all passing ✅

**Config format** (stored in settings table, key = `reporting.scheduled_reports`):
```json
[
  {
    "report_type": "revenue",
    "format": "csv",
    "recipients": ["owner@restaurant.com"],
    "cadence": "weekly",
    "day_of_week": 1,
    "branch_id": null
  }
]
```

---

## ✅ DONE — Category 3C: Twilio STOP Opt-Out Sync

**New files:**
- `api/app/Http/Controllers/Webhooks/TwilioWebhookController.php`
  — validates Twilio HMAC-SHA1 signature, handles STOP/STOPALL/UNSUBSCRIBE/CANCEL/END/QUIT (opt-out) and START/UNSTOP/YES (opt-in); updates `customer_profiles.communication_prefs.sms_marketing`

**Modified:**
- `api/routes/webhooks.php` — added `POST /api/webhooks/twilio/stop`

**Test:** `api/tests/Feature/Sms/TwilioStopOptOutTest.php` — written, not fully verified

---

## Remaining Infrastructure (Intentionally Deferred — Phase 3)

These are blocked on external setup, not code:

- [ ] Infisical project created + project IDs filled into `terraform/staging.yaml` and `terraform/production.yaml`
- [ ] Jenkins pipelines configured for `cheflogik-api` and `cheflogik-web` repos
- [ ] Staging environment verified end-to-end

---

## Fully Implemented Modules (for reference)

| Module | Phase |
|---|---|
| Tenancy (TenantScope, TenantMiddleware) | 1 |
| Auth (3 guards, permissions, roles, JWT, Gate) | 1 |
| Branch & Staff CRUD, scheduling, attendance, payroll export | 1 |
| Document expiry alert (daily 09:00 scheduled) | 1 |
| Menu (categories, items, overrides, 86, platform mappings) | 1 |
| Orders (7 channels, 9 stages, Stripe, refunds, Reverb) | 1 |
| Promo codes, disputes, delivery zones | 2 |
| Platform throttle (Uber Eats + Wolt pause/resume) | 2 |
| Reservations (floor plan, lifecycle, availability, walk-in, waitlist, SMS reminders) | 2 |
| Customer profiles & loyalty (dedup, tiers w/ grace period, earn/redeem, GDPR, campaigns) | 2 |
| Inventory (WAC, GRN, recipes, waste, stocktake, KDS, 86 auto-trigger) | 2 |
| Events (5-phase lifecycle, deposit, corporate accounts, run sheet, tasks, min spend, booking fee) | 2 |
| SaaS onboarding + platform admin panel | 2 |
| Settings (tenant/branch/delegate/cascade resolution) | 2 |
| In-app notifications | 2 |
| Analytics dashboards (5) + aggregation jobs (now scheduled) | 3 |
| Analytics reports + exports + scheduled email delivery | 3 |
| Tax/VAT report, financial period close | 3 |
| Audit log viewer | 3 |
| Dynamic role builder (API) | 3 |
| Customer portal API | 3 |
| Uber Eats integration (full menu sync + orders + store status) | 3 |
| Wolt integration (full menu sync + orders + store status) | 3 |
| Amazon SES transactional + scheduled emails | 3 |
| Twilio STOP opt-out sync | 3 |
| Loyalty tier downgrade grace period | 3 |
