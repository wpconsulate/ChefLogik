# UI Design → Web App Implementation Plan

## Context
Port the complete React UI prototype from /UI/*.jsx (vanilla React + inline styles) into the existing Vite + **React 19.2** + TypeScript ~6.0 + Tailwind v4 + MST web app at /web (dev server port **5500**). Every screen must match the design visually. Global shared components must be created. Existing boilerplate assets replaced.

Backend gaps must be filled before or in parallel with the relevant frontend tasks. Backend tasks are prefixed **B**; frontend tasks are prefixed **T**.

---

## Pre-Implementation Review Protocol

**Before starting any task — B or T — follow this checklist:**

1. **Read the relevant backend files first.**
   - For every frontend screen, read its controller(s), service(s), and route registration in `/api`.
   - Confirm the expected request/response shape before writing a single line of frontend code.
   - If the endpoint is missing or the response shape differs from what the UI needs, raise it before starting frontend work — don't mock then forget.

2. **Read the relevant frontend files first.**
   - For every backend task, read the existing MST store(s) and any existing component(s) in `/web/src` that will consume the new endpoint.
   - Understand what shape of data the store expects so the API resource matches.

3. **Check the route file.**
   - `/api/routes/api.php` is the single source of truth for registered routes.
   - Before adding a new endpoint, confirm the route doesn't already exist under a different name.

4. **Document any new decision in `decisions.md` before writing code.**
   - If you discover a choice not covered by the existing 21 decisions (e.g. how to store OTP codes, message channel model design), record the decision first.

5. **Run existing tests before touching a file.**
   - `php artisan test --filter <RelatedTest>` before and after changes. A green suite before your change confirms you have a clean baseline.

---

## Execution Waves

```
Wave 0 ── B0                           (backend exploration — read all relevant code, produce gap list) ✓ DONE
Wave 1 ── T1  B1  B2  B3  B4  B5      (parallel: CSS tokens + all backend implementations)            ← CURRENT
Wave 2 ── T2  T3  T5  T7              (frontend shell + login + shared components; all need T1)
Wave 3 ── T4                           (AppShell rewrite; needs T2 + T3)
Wave 4 ── T6                           (new /kds route; needs T4)
Wave 5 ── T8  T9  T10 T11 T12         (all screens in parallel; T8 wires B2, T3/T8 wire B3+B4,
           T13 T14 T15 T16 T17         T5 wires B1; all need T4 + T7)
Wave 6 ── T18                          (asset cleanup; needs all screens)
```

---

## Codebase Quick-Reference

| What | Where |
|---|---|
| CSS tokens + themes | `web/src/index.css` (`:root` cl-* at lines 108-119; theme blocks 182-239) |
| Theme type + cookie | `web/src/lib/theme.ts` (ThemeId line 3; THEMES line 13; getThemeCookie line 24) |
| Root MST store | `web/src/stores/root.ts` (add new stores here) |
| Store hooks | `web/src/stores/context.tsx` (add `useXxxStore()` hooks here) |
| ApiService singleton | `web/src/services/api.ts` — `api.get/post/put/patch/delete(url, ...)` |
| Auth store | `web/src/stores/AuthStore.ts` — `login()` at line 60, `logout()` at line 93 |
| Notification store | `web/src/stores/NotificationStore.ts` — `fetchNotifications`, `markAllRead`, `receiveNotification` |
| Notification WS | `web/src/websocket/notificationChannel.ts` — channel: `user.{userId}.notifications` |
| WS echo init | `web/src/websocket/echo.ts` |
| Existing AppShell | `web/src/components/layout/AppShell.tsx` — impersonation banner 122-140, WS init 95-106 |
| Login page | `web/src/components/auth/LoginPage.tsx` — basic sign-in only (188 lines) |
| Auth controller | `api/app/Http/Controllers/Api/V1/Auth/StaffAuthController.php` — login 27, me 137 |
| Notification controller | `api/app/Http/Controllers/Api/V1/Notifications/NotificationController.php` |
| Notification resource | `api/app/Http/Resources/Notifications/NotificationResource.php` — add `icon_type` |
| Notification event | `api/app/Events/Notifications/NotificationCreated.php` — broadcasts `.notification.created` |
| Dashboard controller | `api/app/Http/Controllers/Api/V1/Analytics/DashboardController.php` — add `operationalSummary()` |
| Routes file | `api/routes/api.php` |

---

## Wave 1 — Active Work

### B0 Findings (complete)
- **Notifications**: all 4 endpoints registered and `NotificationStore` fully wired — B4 is a verification pass only
- **Auth**: login/logout/forgot/reset exist; OTP and account-lock are absent — B1 needed
- **Dashboard**: analytics dashboards exist (historical); no operational live-counts endpoint — B2 needed
- **Messages**: nothing exists at all — B3 is new from scratch
- **Onboarding**: signup + branch setup exist; team-invite step absent — B5 needed
- **Theme**: `data-theme="orange"` must become `"sunrise"`; `ThemeId = 'orange'` must become `'sunrise'`

### T1 — CSS tokens + theme rename
`web/src/index.css`, `web/src/lib/theme.ts`
- Add `--cl-bg/card/danger/warning/success/muted/border/text/text-soft` to `:root`
- Add `--cl-primary` + `--cl-dark` to each `[data-theme]` block (hex values from design)
- Add keyframes `pulse`, `slideIn`, `fadeIn`
- Rename `[data-theme="orange"]` → `[data-theme="sunrise"]`
- `theme.ts`: `ThemeId 'orange'` → `'sunrise'`; update THEMES id; update cookie fallback guard

### B1 — Staff OTP + account lock
`new StaffOtpService.php`, `AuthService.php`, `StaffAuthController.php`, new migration
- Migration: add `failed_login_attempts int default 0`, `locked_until timestamp null` to `users`
- `StaffOtpService`: generate (6-digit, Redis `otp:{userId}:{mode}` TTL 600s), verify (consume on match)
- `AuthService::loginStaff()`: check `locked_until` before auth; increment attempts on failure; lock after 5
- `POST /api/v1/auth/staff/otp/send` (mode: `reset`; 2fa deferred)
- `POST /api/v1/auth/staff/otp/verify` → returns short-lived reset token on success

### B2 — Dashboard operational endpoint
`DashboardController.php`, `api/routes/api.php`
- `GET /api/v1/dashboard/operational?branch_id={uuid}`
- Returns: `active_orders`, `tables_occupied`, `tables_total`, `waitlist_count`, `revenue_today`
- Single DB pass; permission gate `analytics.branch_dashboard`

### B3 — Messages/Chat
3 new migrations + 3 models + controller + Reverb event + routes
- Tables: `message_channels`, `messages`, `message_reads` (all tenant-scoped)
- Seed 3 system channels (kitchen/managers/foh) in `OnboardingService::setupBranch()`
- `GET /api/v1/messages/channels` — list with last message + per-user unread count
- `POST /api/v1/messages/channels/{id}/messages` — post + broadcast `MessageSent` on `messages.{tenantId}`

### B4 — Notifications verify + broadcast
`NotificationResource.php`, any `Notification*` event
- Confirm `title`, `body`, `type`, `data`, `read_at`, `created_at` in resource (add if missing)
- Confirm or create `NotificationCreated` broadcast event on `notifications.{userId}` Reverb channel

### B5 — Onboarding team invite
`OnboardingController.php`, `OnboardingService.php`, routes
- `POST /api/v1/onboarding/invite-staff` — `invites: [{email, role_slug}]` max 10
- Creates users with `status=invited`, dispatches invite email; "Skip for now" calls existing `/onboarding/complete`

---

## Task Summary

### Backend Tasks

| ID | Task | Key Files |
|---|---|---|
| **B0** | Backend exploration — read all controllers, services, routes; produce gap list | `/api/routes/api.php`, all controllers |
| **B1** | Auth gaps — staff OTP (2FA + password reset), account-lock detection | `StaffAuthController`, new `StaffOtpService`, migration |
| **B2** | Dashboard operational summary endpoint (live counts: orders, tables, waitlist, revenue) | New `OperationalSummaryController` or extend `DashboardController` |
| **B3** | Messages/Chat — new feature (channels, messages, WebSocket broadcast) | New `MessageChannel`, `Message` models + controller + Reverb channel |
| **B4** | Notifications — verify routes + WebSocket broadcast payload shape | `NotificationController`, `NotificationBroadcast` event, routes |
| **B5** | Onboarding — team invite step (step 3 of wizard) | `OnboardingController.inviteStaff()`, new request + service method |

### Frontend Tasks

| ID | Task | Key Files |
|---|---|---|
| **T1** | CSS tokens + theme rename (orange→sunrise) | web/src/index.css, web/src/lib/theme.ts |
| **T2** | Sidebar component (fixed, 4 nav groups, branch selector) | web/src/components/layout/Sidebar.tsx |
| **T3** | Header + 3 dropdowns (Notif, Messages, User+theme-switcher) | web/src/components/layout/Header.tsx, NotifDropdown.tsx, MessagesDropdown.tsx, UserDropdown.tsx |
| **T4** | AppShell rewrite (compose Sidebar + Header, fixed layout) | web/src/components/layout/AppShell.tsx |
| **T5** | Login: full 6-screen flow (SignIn, OTP, Forgot, Locked, Onboarding) | web/src/components/auth/LoginPage.tsx + 5 screen files |
| **T6** | New /kds top-level route | web/src/routes/_authenticated/kds.tsx |
| **T7** | Global shared UI components (StatCard, TabBar, FilterBar, Kanban, DataTable, etc.) | web/src/components/ui/*.tsx, web/src/components/shared/*.tsx |
| **T8** | Dashboard screen | web/src/components/dashboard/*.tsx |
| **T9** | Live Orders Kanban screen | web/src/components/orders/*.tsx |
| **T10** | KDS screen (dark mode, allergen banner, 86 overlay) | web/src/components/kds/*.tsx |
| **T11** | Tables & Reservations screen (floor canvas + detail panel) | web/src/components/reservations/*.tsx |
| **T12** | Events & Functions Kanban screen | web/src/components/events/*.tsx |
| **T13** | Menu Management screen (4 tabs, 86 manager) | web/src/components/menu/*.tsx |
| **T14** | Inventory screen (stats bar + table) | web/src/components/inventory/*.tsx |
| **T15** | Customers & Loyalty screen | web/src/components/customers/*.tsx |
| **T16** | Staff Management screen (master-detail, 3-tab profile) | web/src/components/staff/*.tsx |
| **T17** | Analytics & Reports screen (SVG charts) | web/src/components/analytics/*.tsx |
| **T18** | Asset cleanup (delete boilerplate, run lint + tests) | Various |

---

## Key Design Decisions (already confirmed)

- **Theme rename**: orange → sunrise everywhere (CSS data-attr, ThemeId type, cookie)
- **Sidebar nav**: 4 groups — Operations / Management / Insights / Settings (adds Shifts, Attendance, Branches, Roles, Settings beyond the 9-item design)
- **Admin screens** (cl-admin-*.jsx): out of scope for /web
- **Platform Sync tab**: stub "integration pending" placeholder
- **Login**: full 6-screen flow from cl-login.jsx (not just basic sign-in)
- **KDS route**: new top-level /kds; old /inventory/kds redirects
- **Tables**: /reservations index becomes combined floor+list+waitlist (view toggle)

---

## Backend Gaps (known at plan time)

| Feature | Gap | Resolution |
|---|---|---|
| Staff OTP / 2FA | No OTP flow for staff — only customers have `CustomerOtpService`. Backend uses email-link reset. | B1: add `StaffOtpService` (6-digit code, Redis TTL 10 min), two new endpoints |
| Account lock | No failed-login tracking; no 423 response | B1: track attempts on `users` table, return 423 + lockout_until on threshold |
| Dashboard live counts | `DashboardController` serves historical analytics only. No endpoint for active orders, occupied tables, waitlist, revenue today | B2: new `/api/v1/dashboard/operational` endpoint |
| Messages/Chat | No model, controller, WebSocket channel, or migration | B3: build from scratch with stub channels |
| Notifications broadcast shape | Endpoints exist; need to verify event payload matches what `NotificationStore` expects | B4: read and align |
| Onboarding team-invite step | Signup + branch setup exist; no invite-staff step | B5: add `OnboardingController::inviteStaff()` |
| Staff Performance analytics | No per-staff metric aggregation | T17: mock data; deferred |
| Table Merge/Split | No backend implementation | T11: buttons disabled; deferred |
| RFM / Monthly revenue | Models exist; no shaped endpoints | T17: mock data; deferred |

---

## B0 — Backend Exploration
**No dependencies. Run before any other task.**

Read and map the following before writing any code. Produce a short findings note inline or in a comment on this task:

| Area | Files to read |
|---|---|
| Auth routes + middleware | `/api/routes/api.php` (auth section), `StaffAuthController`, `AuthService`, `StaffPasswordResetService` |
| Notification routes + event | `NotificationController`, `NotificationResource`, any `Notification*` event/listener, routes registration |
| Dashboard controllers | `DashboardController`, `AnalyticsService` (owner + branch dashboard methods) |
| Onboarding flow | `SignupController`, `OnboardingController`, `OnboardingService` |
| Messages (check if anything exists) | Search `app/` for `message`, `chat`, `thread` — confirm nothing exists |
| Shifts + Attendance routes | `ShiftController`, `AttendanceController`, confirm routes registered |
| Existing MST stores | `/web/src/stores/` — read `AuthStore`, `NotificationStore`, any existing `DashboardStore`; map expected API shape |

---

## B1 — Auth: Staff OTP + Account Lock
**Depends on: B0.**

### What exists
- `POST /api/v1/auth/login` — email + password + tenant_slug → 8-hour Sanctum token
- `POST /api/v1/auth/forgot-password` — sends email reset **link** (token-based, not OTP code)
- `POST /api/v1/auth/reset-password` — verifies reset token, updates password
- No 2FA. No failed-login tracking. No account lock.

### What the UI needs
- Login: same — no change needed to existing endpoint
- OTP screen (2FA mode): `POST /api/v1/auth/otp/verify` after login returns `requires_2fa: true`
- OTP screen (reset mode): `POST /api/v1/auth/otp/send` + `POST /api/v1/auth/otp/verify`
- Account lock: login returns HTTP 423 with `{ locked_until: ISO8601 }` after N failed attempts

### Subtasks

| # | Subtask |
|---|---|
| B1.1 | **Review**: Read `AuthService::loginStaff()`, `StaffPasswordResetService` in full. Note token storage mechanism. |
| B1.2 | **Migration**: Add `failed_login_attempts int default 0`, `locked_until timestamp null` to `users` table |
| B1.3 | **Service**: Create `App\Services\Auth\StaffOtpService` — `generate(userId): string` (6-digit, store in Redis key `otp:{userId}:{mode}`, TTL 600s), `verify(userId, mode, code): bool` (consume on success) |
| B1.4 | **Auth controller — account lock**: In `AuthService::loginStaff()`, after failed credential check increment `failed_login_attempts`; after 5 failures set `locked_until = now()+30min`; at login start if `locked_until > now()` return 423 `{ message, locked_until }` |
| B1.5 | **New endpoint**: `POST /api/v1/auth/otp/send` — generates 6-digit code, stores in Redis, **logs code to application log in dev** (email dispatch blocked by **Decision 9 — email provider pending**; add a `// TODO Decision 9` comment and dispatch `StaffOtpMailJob` once resolved); modes: `reset` only for now |
| B1.6 | **New endpoint**: `POST /api/v1/auth/otp/verify` — validates code; on success for `reset` mode returns a short-lived password-reset token; replaces current email-link verify step |
| B1.7 | **Adapt existing reset flow**: `POST /api/v1/auth/reset-password` (`StaffAuthController::resetPassword`, line 116) — accept both old email-link token and new OTP-issued token (backwards compatible) |
| B1.8 | **Frontend wire-up** (do in T5): `AuthStore.login()` (`stores/AuthStore.ts:60`) — add `lockedUntil: types.maybeNull(types.string)` field; catch AxiosError `err.response?.status === 423` → set `self.lockedUntil`; add `requestPasswordReset(email, tenantSlug)` flow action; add `verifyOtp(code, mode)` flow action |
| B1.9 | **Tests**: locked-after-5-failures, OTP-send, OTP-verify-success, OTP-verify-wrong-code, OTP-expired |

**Key files:** `api/app/Services/Auth/StaffOtpService.php` (new), `api/app/Services/Auth/AuthService.php`, `api/app/Http/Controllers/Api/V1/Auth/StaffAuthController.php` (login at line 27, resetPassword at line 116), new migration; frontend: `web/src/stores/AuthStore.ts:60-73`

---

## B2 — Dashboard: Operational Summary Endpoint
**Depends on: B0.**

### What exists
- `GET /api/v1/analytics/dashboard/branch` — revenue trend, top dishes, menu engineering (historical)
- `GET /api/v1/analytics/dashboard/owner` — cross-branch revenue, customer segments (historical)
- No live operational counts endpoint.

### What the UI needs (T8 Dashboard screen)
Four live stat cards: **Active Orders**, **Tables Seated**, **Walk-in Waitlist**, **Revenue Today**

### Subtasks

| # | Subtask |
|---|---|
| B2.1 | **Review**: Read `DashboardController`, `AnalyticsService` — confirm no operational summary method already exists |
| B2.2 | **New endpoint**: `GET /api/v1/dashboard/operational?branch_id={uuid}` |
| B2.3 | Response shape: `{ active_orders: int, tables_occupied: int, tables_total: int, waitlist_count: int, revenue_today: { amount: int, currency: string } }` |
| B2.4 | **Implementation**: Single controller action, direct DB queries (not via AnalyticsService — this is live data, not aggregated): count orders where status not in (completed, cancelled), count tables where status = occupied, count waitlist entries, sum order totals for today |
| B2.5 | **Permission**: gate on `analytics.branch_dashboard` (same as existing branch dashboard) |
| B2.6 | **Frontend wire-up** (do in T8): `DashboardStore.fetchOperationalSummary(branchId)` calls this endpoint; stats bar reads from store |
| B2.7 | **Tests**: counts correct for tenant scope, zero state (no orders/tables), multi-tenant isolation |

**Key files:** `api/app/Http/Controllers/Api/V1/Analytics/DashboardController.php` (add `operationalSummary()` method after `kitchenDashboard()` at line 54), `api/routes/api.php`

**New frontend store required:** `DashboardStore` does not yet exist in `root.ts`. Create `web/src/stores/DashboardStore.ts` with `operational` map + `fetchOperationalSummary(branchId)` flow action. Add to `root.ts`: `dashboard: types.optional(DashboardStore, {})`. Add `useDashboardStore()` hook to `web/src/stores/context.tsx` following existing hook pattern (e.g. `useAnalyticsStore` at line 58).

---

## B3 — Messages / Chat (New Feature)
**Depends on: B0.**

### What exists
Nothing — no model, migration, controller, route, or WebSocket channel.

### What the UI needs (T3 MessagesDropdown)
- Header dropdown showing thread list: channel name, last message preview, unread count, timestamp
- Four default channels: **Kitchen**, **Managers**, **FOH**, **Direct**
- Clicking a thread → "Open inbox →" (full inbox is out of scope for this plan; stub the route)
- Real-time: new messages push an unread badge update via WebSocket

### Scope for this plan
Build the minimum required to power the dropdown: channel list + last message + unread counts + broadcast. Full inbox UI is deferred.

### Subtasks

| # | Subtask |
|---|---|
| B3.1 | **Decision**: Record in `decisions.md` — message storage approach (DB-backed, tenant-scoped) and channel types (system-seeded channels per tenant + direct) |
| B3.2 | **Migration**: `message_channels` table — `id uuid`, `tenant_id uuid`, `name varchar`, `type enum(kitchen,managers,foh,direct)`, `created_at`, `updated_at` |
| B3.3 | **Migration**: `messages` table — `id uuid`, `tenant_id uuid`, `channel_id uuid FK`, `sender_id uuid FK users`, `body text`, `created_at` |
| B3.4 | **Migration**: `message_reads` table — `id uuid`, `message_id uuid FK`, `user_id uuid FK`, `read_at timestamp` — used to compute per-user unread count |
| B3.5 | **Models**: `MessageChannel` (HasTenantScope, hasMany messages), `Message` (HasTenantScope, belongsTo channel + sender), `MessageRead` |
| B3.6 | **Seeder**: After tenant signup, seed 4 system channels (kitchen, managers, foh) via `OnboardingService` |
| B3.7 | **Controller**: `MessageChannelController` — `index()` returns channel list with last_message + unread_count per authenticated user |
| B3.8 | **Controller**: `MessageController` — `store(channelId)` posts a message; broadcasts `MessageSent` event on `messages.{tenantId}` Reverb channel |
| B3.9 | **New endpoint**: `GET /api/v1/messages/channels` — thread list for dropdown |
| B3.10 | **New endpoint**: `POST /api/v1/messages/channels/{id}/messages` — send message |
| B3.11 | **Reverb channel**: `messages.{tenantId}` — private channel; `MessageSent` event carries channel_id + message preview + sender |
| B3.12 | **Frontend wire-up** (do in T3): `MessagesStore` (new MST store) calls `GET /api/v1/messages/channels`; `MessagesDropdown` reads from it; subscribes to `messages.{tenantId}` channel for badge updates |
| B3.13 | **Tests**: channel list scoped to tenant, unread count correct, broadcast fires on message post |

**Key files:** New migrations, `api/app/Models/MessageChannel.php`, `api/app/Models/Message.php`, `api/app/Http/Controllers/Api/V1/Messages/MessageChannelController.php`, `api/app/Events/MessageSent.php`, `api/routes/api.php`

**New frontend store required:** `MessagesStore` does not yet exist. Create `web/src/stores/MessagesStore.ts` (channels map + `fetchChannels()` + `receiveMessage()` flow actions). Add to `root.ts` alongside other stores. Add `useMessagesStore()` hook to `context.tsx`.

**New WebSocket channel:** Create `web/src/websocket/messagesChannel.ts` following the pattern of `notificationChannel.ts` — subscribe to `messages.{tenantId}` private channel, listen for `.message.sent` event, call `MessagesStore.receiveMessage()`.

---

## B4 — Notifications: Route Verification + Broadcast Payload
**Depends on: B0.**

> **Status note**: B4 is ~90% complete already. All routes, the broadcast event, and the frontend subscription exist. Only remaining gap: `icon_type` missing from `NotificationResource`.

### What exists (verified)
- `GET /api/v1/notifications` — registered ✓ (`api/routes/api.php:407`)
- `GET /api/v1/notifications/unread-count` — registered ✓
- `PATCH /api/v1/notifications/{notification}/read` — registered ✓ (**not** POST — plan was wrong)
- `POST /api/v1/notifications/mark-all-read` — registered ✓
- `NotificationResource` (`api/app/Http/Resources/Notifications/NotificationResource.php`) returns: `id`, `type`, `title`, `body`, `data`, `read_at`, `created_at` ✓ — **`icon_type` missing**
- `NotificationCreated` event (`api/app/Events/Notifications/NotificationCreated.php`) exists ✓ — broadcasts on `user.{recipientId}.notifications` private channel ✓ with event name `.notification.created` ✓
- Frontend WebSocket subscription: `web/src/websocket/notificationChannel.ts` subscribes to `user.${userId}.notifications` ✓ — already wired in `AppShell.tsx:95-106` via `subscribeToStaffNotifications()`
- `NotificationStore` (`web/src/stores/NotificationStore.ts`): fully implemented with `fetchNotifications`, `markAllRead`, `receiveNotification` ✓
- `NotificationService.ts` correctly uses `api.patch('/notifications/{id}/read')` ✓

### Subtasks

| # | Subtask |
|---|---|
| B4.1 | ~~**Review routes**~~ **Already confirmed** (see above) |
| B4.2 | ~~**Review NotificationResource fields**~~ **Already confirmed** — `title`, `body`, `type`, `data`, `read_at`, `created_at` all present |
| B4.3 | **Gap fix**: Add `icon_type` to `NotificationResource::toArray()` — read from `$this->data['icon_type'] ?? null`; valid values match the icon map in `NotifDropdown` | `api/app/Http/Resources/Notifications/NotificationResource.php` |
| B4.4 | ~~**Review broadcast event**~~ **Already confirmed** — `NotificationCreated` at `api/app/Events/Notifications/NotificationCreated.php` broadcasts correct payload |
| B4.5 | ~~**Create broadcast event**~~ **Not needed** — already exists |
| B4.6 | **Frontend wire-up** (do in T3): `NotifDropdown` reads `useNotificationStore()` (hook at `context.tsx:82`); "Mark all read" calls `notifications.markAllRead()`. WebSocket subscription moves from `AppShell.tsx:95-106` into `Header.tsx` (or stays in AppShell — decide in T4) |

**Key files:** `api/app/Http/Resources/Notifications/NotificationResource.php:12-29` (add `icon_type`), `web/src/stores/NotificationStore.ts`, `web/src/services/NotificationService.ts`, `web/src/websocket/notificationChannel.ts`

---

## B5 — Onboarding: Team Invite Step
**Depends on: B0.**

### What exists
- `POST /api/public/signup` — creates tenant + owner user, returns token (Step 0: Account)
- `POST /api/v1/onboarding/branch` — creates first branch (Step 1: Restaurant)
- `POST /api/v1/onboarding/complete` — marks onboarding done
- No endpoint for Step 2: Team (invite staff)

### What the UI needs (T5 OnboardingScreen Step 2)
A list of up to N email + role pairs → creates pending staff invitations or direct accounts; "Skip for now" is always available.

### Subtasks

| # | Subtask |
|---|---|
| B5.1 | **Review**: Read `OnboardingController`, `OnboardingService`, `StaffController` — understand how staff accounts are created to reuse the pattern |
| B5.2 | **New endpoint**: `POST /api/v1/onboarding/invite-staff` — accepts `invites: [{ email, role_slug }]` array (max 10); creates `User` records with `status = invited` and sends password-set emails; advances onboarding to `invites_sent` step |
| B5.3 | **Service method**: `OnboardingService::inviteStaff(array invites, Tenant tenant): void` — loops invites, creates users via existing `StaffController` creation logic, dispatches `StaffInvitedNotification` queued job. **Email dispatch blocked by Decision 9** — add `// TODO Decision 9` stub; create users with `status = invited` so invite still registers even without email |
| B5.4 | **Validation**: each invite must have valid email + role_slug that exists in tenant's roles; duplicates silently skipped |
| B5.5 | **Frontend wire-up** (do in T5): Step 2 of `OnboardingScreen` calls `authStore.inviteStaff(invites)`; "Skip for now" calls `POST /api/v1/onboarding/complete` directly |
| B5.6 | **Tests**: invites create users, skip-for-now completes onboarding, duplicate email skipped, invalid role rejected |

**Key files:** `api/app/Http/Controllers/Api/V1/Onboarding/OnboardingController.php`, `api/app/Services/Tenants/OnboardingService.php`, `api/routes/api.php`

---

## T1 — Foundation: CSS tokens + theme system
**No dependencies.**

> **Status note**: `--cl-bg`, `--cl-card`, `--cl-danger`, `--cl-warning`, `--cl-success`, `--cl-muted`, `--cl-border`, `--cl-text`, `--cl-text-soft`, `--cl-primary`, `--cl-dark` are **already present** in `:root` at `index.css:108-119`. Subtask 1.1 below is effectively done — verify and skip if tokens match design values.

| # | Subtask | File |
|---|---|---|
| 1.1 | ~~Add `--cl-bg` … `--cl-text-soft` to `:root`~~ **Already done** (`index.css:108-119`). Verify hex values match design; update if different. | `web/src/index.css` |
| 1.2 | Add `--cl-primary` + `--cl-dark` **per-theme override** to each `[data-theme]` block — the block-level overrides are missing. Ocean block: `index.css:182-199`; Forest: `200-219`; Sunrise/orange: `221-239`. Values: Ocean `--cl-primary:#4A7FA7 --cl-dark:#1A3D63`, Forest `--cl-primary:#68BA7F --cl-dark:#2E6F40`, Sunrise `--cl-primary:#F97316 --cl-dark:#C2410C` | `web/src/index.css` |
| 1.3 | Add keyframes: `pulse` (opacity 1→0.5→1), `slideIn` (translateY(-8px)→0 + opacity), `fadeIn` (opacity 0→1) | `web/src/index.css` |
| 1.4 | Rename `[data-theme="orange"]` (line 222) → `[data-theme="sunrise"]`; update comment line 221 "Sunrise (Moniex Orange)" → "Sunrise" | `web/src/index.css` |
| 1.5 | `ThemeId` (line 3): `'orange'` → `'sunrise'`; `THEMES[2].id` (line 16): `'orange'` → `'sunrise'`; `getThemeCookie` guard (line 28) auto-handles via `THEMES.some()` but verify after rename | `web/src/lib/theme.ts` |

---

## T2 — Shell: Sidebar component
**Depends on: T1.**

| # | Subtask |
|---|---|
| 2.1 | Create `Sidebar.tsx` — fixed `left:16px top:16px bottom:16px width:224px`, white card, `borderRadius:16px`, shadow |
| 2.2 | Logo: gradient CL box (`linear-gradient(135deg, --cl-primary, --cl-dark)`) + "ChefLogik" text |
| 2.3 | Nav groups with uppercase muted group headers (10px, 0.08em tracking): **Operations** (Dashboard, Live Orders+badge, Kitchen Display `/kds`, Tables & Reservations, Events & Functions) · **Management** (Menu Management, Inventory, Staff, Shifts, Attendance, Customers & Loyalty) · **Insights** (Analytics & Reports) · **Settings** (Branches, Roles, Settings) |
| 2.4 | Active item: `var(--cl-dark)` bg, white text, `borderRadius:10px`; hover: `rgba(--cl-primary, 0.2)` |
| 2.5 | Branch selector at bottom: MapPin icon + branch name + ChevronDown; opens upward popover with branch list from `BranchStore` |
| 2.6 | Permission gate each nav item via `authStore.can()` / `authStore.canAny()` |

**File:** `web/src/components/layout/Sidebar.tsx`

**Code to migrate from AppShell:** Nav items currently defined as `NAV_ITEMS` array at `AppShell.tsx:63-76`; `SidebarNavItem` sub-component at `AppShell.tsx:250-277`. Move + expand these. Branch selector is `BranchSwitcher.tsx` at `components/layout/BranchSwitcher.tsx` — replace with inline branch popover reading from `useBranchStore()` (`context.tsx:22`).

---

## T3 — Shell: Header + three dropdowns
**Depends on: T1. Wire to B3 (messages) + B4 (notifications) when those backend tasks are done.**

| # | Subtask |
|---|---|
| 3.1 | `Header.tsx` — fixed `top:0 left:256px right:0 height:64px`, transparent bg; breadcrumb left, search centre (max-width 380px, rounded-xl, shadow), actions right |
| 3.2 | Right actions: LIVE pill (pulsing green dot + "LIVE") → Messages btn (badge) → Bell btn (badge) → User pill (gradient avatar + name + role + chevron) |
| 3.3 | `NotifDropdown.tsx` — header (title + unread count + "Mark all read"), items (icon box + title + body + time + unread dot + optional action btn), footer ("See all →"); reads `NotificationStore`; calls `POST /api/v1/notifications/mark-all-read` |
| 3.4 | `MessagesDropdown.tsx` — header, items (avatar initials + channel label uppercase + body preview + time + unread dot), footer ("Open inbox →"); reads `MessagesStore` (from B3); **fallback: mock data if B3 not yet complete** |
| 3.5 | `UserDropdown.tsx` — user info (name + email + role badge), 3-swatch palette picker (Ocean/Forest/Sunrise) updating `data-theme` + cookie, My Profile link, Sign out btn (danger) |
| 3.6 | Click-outside handler: only one dropdown open at a time |

**Files:** `web/src/components/layout/Header.tsx`, `NotifDropdown.tsx`, `MessagesDropdown.tsx`, `UserDropdown.tsx`

**Existing components to replace:** `NotificationBell.tsx` at `components/layout/NotificationBell.tsx` → replaced by `NotifDropdown.tsx`. `UserMenu.tsx` at `components/layout/UserMenu.tsx` → replaced by `UserDropdown.tsx`. `MessagesDropdown` is new (no existing component). `NotificationStore` accessed via `useNotificationStore()` (hook at `context.tsx:82`). `MessagesStore` accessed via `useMessagesStore()` (new hook, created as part of B3).

---

## T4 — Shell: AppShell rewrite
**Depends on: T2, T3.**

| # | Subtask |
|---|---|
| 4.1 | Rewrite `AppShell.tsx` to compose `Sidebar` + `Header` |
| 4.2 | Content area: `marginLeft:256px; paddingTop:72px; paddingRight:20px; paddingBottom:20px; minHeight:100vh; background:var(--cl-bg)` |
| 4.3 | Content inner card: white, `borderRadius:16px`, shadow, `minHeight:calc(100vh - 92px)`, `overflow:hidden` |
| 4.4 | Footer inline below card (centred, 12px muted): "© 2026 ChefLogik Ltd · Terms · Privacy · Contact" |
| 4.5 | Keep impersonation banner (amber strip, `z-index:150`, pushes header down when visible) — preserve logic from `AppShell.tsx:122-140`; `handleEndImpersonation()` at `AppShell.tsx:113-118` (reads `VITE_ADMIN_URL` env var) |
| 4.6 | Keep `useEffect` notification WebSocket subscription from `AppShell.tsx:95-106` — move init into this rewrite or pass down to `Header.tsx`; either way `notifications.setUnsubscribe()` + cleanup on unmount must be preserved |
| 4.7 | Remove: `BranchSwitcher` import, `AppFooter` import, `UserMenu` import, `NotificationBell` import — all replaced by new Sidebar/Header sub-components |

**File:** `web/src/components/layout/AppShell.tsx`

---

## T5 — Login: Full 6-screen flow
**Depends on: T1. Wire OTP + lock screens to B1 when backend task is done.**

| # | Subtask |
|---|---|
| 5.1 | Rewrite `LoginPage.tsx` as flow controller managing `screen` state (`'signin' \| 'otp-2fa' \| 'forgot' \| 'otp-reset' \| 'locked' \| 'onboard'`); shared primitives inline: `BrandPanel`, `Field`, `PrimaryBtn`, `Divider`, `BackLink`, `SlidePanel` (fade+slide), `EyeToggle` |
| 5.2 | `BrandPanel` — left 52% navy gradient, 3 decorative rings, 2 rotated squares, CL logo, tagline, feature bullet row |
| 5.3 | `SignInScreen.tsx` — email + password (eye toggle) + Restaurant ID (maps to `tenant_slug`) + SSO row (Google/Microsoft, UI-only) + Divider + remember-me checkbox + error banner; calls `authStore.login()`; on 423 response → navigate to Locked screen |
| 5.4 | `OTPScreen.tsx` — 6 individual digit inputs, auto-advance, backspace-retreat, paste, auto-submit when full; resend countdown 30s; modes: `'2fa'` and `'reset'`; calls `authStore.verifyOtp()`; **uses B1 endpoints** |
| 5.5 | `ForgotPasswordScreen.tsx` — email + tenant_slug fields + "Send reset code" btn; calls `authStore.requestPasswordReset()`; navigates to OTP reset mode; **uses B1 `POST /auth/otp/send`** |
| 5.6 | `AccountLockedScreen.tsx` — lock icon, locked message, countdown from `locked_until` value returned by B1, "Contact administrator" outline btn, Back link |
| 5.7 | `OnboardingScreen.tsx` — `OnboardProgress` stepper (3 steps); Step 0: Account (name + email + password → `POST /api/public/signup`); Step 1: Restaurant (name + slug + branch count + cuisine → `POST /api/v1/onboarding/branch`); Step 2: Team (invite emails + roles → `POST /api/v1/onboarding/invite-staff` from B5, or "Skip for now" → `POST /api/v1/onboarding/complete`); Done: success icon + "Enter ChefLogik →" |
| 5.8 | Delete `web/src/components/auth/ForgotPasswordPage.tsx` (folded into LoginPage); update `web/src/routes/forgot-password.tsx` to redirect to `/login` — do not delete the route file, the route is still registered in `routeTree.gen.ts` |

**Files:** `web/src/components/auth/LoginPage.tsx` (rewrite; currently 188 lines, basic sign-in only), `web/src/routes/login.tsx`, `auth/screens/SignInScreen.tsx`, `OTPScreen.tsx`, `ForgotPasswordScreen.tsx`, `AccountLockedScreen.tsx`, `OnboardingScreen.tsx`

**AuthStore changes required (do alongside T5):** Add to `AuthStore.ts`:
- `lockedUntil: types.maybeNull(types.string)` model field
- Update `login()` flow: on `AxiosError` with `err.response?.status === 423`, extract `err.response.data.locked_until` → `self.lockedUntil`
- New `requestPasswordReset(email, tenantSlug)` flow action → `POST /auth/staff/otp/send`
- New `verifyOtp(code, mode)` flow action → `POST /auth/staff/otp/verify`
- New `completeOnboarding()` flow action → `POST /onboarding/complete`

---

## T6 — New /kds top-level route
**Depends on: T4.**

| # | Subtask |
|---|---|
| 6.1 | Create `web/src/routes/_authenticated/kds.tsx` — renders `KdsScreen` (built in T10) |
| 6.2 | Update `web/src/routes/_authenticated/inventory/kds.tsx` — replace with redirect to `/kds` |
| 6.3 | Sidebar: Kitchen Display item already points to `/kds` (set in T2) — verify route match |

**Files:** `web/src/routes/_authenticated/kds.tsx`, `web/src/routes/_authenticated/inventory/kds.tsx`

---

## T7 — Global shared UI components
**Depends on: T1.**

**`web/src/components/ui/`**

| # | Component | Spec |
|---|---|---|
| 7.1 | `StatCard.tsx` | Props: `icon`, `value`, `label`, `color` (icon bg hex), `bg` (card bg hex) — icon box (42px, borderRadius 11px) + value (22px bold) + label (12px muted) |
| 7.2 | `PageHeader.tsx` | Props: `title`, `subtitle?`, `actions?` (ReactNode) — flex row: h1 (22px bold) + p (13.5px muted) + right slot |
| 7.3 | `StatusBadge.tsx` | Props: `status` string → coloured pill. Covers: Confirmed/Pending/Cancelled/No-show/Preparing/Ready/Dispatched/Completed/Active/Inactive/Valid/Expiring |
| 7.4 | `ChannelBadge.tsx` | Props: `channel` string → coloured pill. Covers: Dine-in/QR/Online/POS/Phone/Uber Eats/DoorDash |
| 7.5 | `AllergenBadge.tsx` | Props: `allergen` string → red-bordered pill with per-allergen colour from ALLERGEN_COLORS map |
| 7.6 | `FilterBar.tsx` | Props: `options: string[]`, `active: string`, `onChange` — toggle button row; active = `--cl-dark` bg + white; channel filter variant accepts colour override |
| 7.7 | `ConfirmModal.tsx` | Props: `open`, `title`, `body`, `confirmLabel`, `onConfirm`, `onCancel` — fixed overlay + centred white card, Cancel + Confirm buttons |
| 7.8 | `TabBar.tsx` | Props: `tabs: {id, label, badge?}[]`, `active`, `onChange` — underline tabs; active = `--cl-dark` colour + 2px solid border-bottom |
| 7.9 | `SectionHeader.tsx` | Props: `title`, `count?`, `action?` — small h2 + optional count badge + optional right action |

**`web/src/components/shared/`**

| # | Component | Spec |
|---|---|---|
| 7.10 | `KanbanBoard.tsx` | Props: `children` — horizontal-scroll flex row, gap 14px, full-height |
| 7.11 | `KanbanColumn.tsx` | Props: `label`, `count`, `color`, `bg` — column header pill (coloured dot + label + count badge) + scrollable card slot |
| 7.12 | `DataTable.tsx` | Props: `headers: string[]`, `children` — `<table>` with styled `<thead>` (uppercase, 11.5px, muted, 0.06em tracking) + `<tbody>` slot |

---

## T8 — Dashboard screen
**Depends on: T4, T7. Wire live stats to B2 when backend task is done.**

| # | Subtask |
|---|---|
| 8.1 | `DashboardScreen.tsx` — page wrapper `padding:28px`; `PageHeader` (title, date+branch+service subtitle, "New Walk-in" outline btn + "New Reservation" primary btn) |
| 8.2 | `StatsBar.tsx` — 4-col `StatCard` grid: Active Orders, Tables Seated, Walk-in Waitlist, Revenue Today; reads from `DashboardStore.operational` (calls `GET /api/v1/dashboard/operational` from B2); **fallback: mock counts if B2 not yet done** |
| 8.3 | `LiveOrdersFeed.tsx` — section header + pulsing LIVE dot + "View all →" link to `/orders`; order rows: id + `ChannelBadge` + items (truncated) + total + clock timer + `StatusBadge`; reads `OrderStore.recentOrders` |
| 8.4 | `AlertsPanel.tsx` — right column 340px; "Alerts" header + danger count badge; alert cards with left-border (danger=red / warning=amber), icon + title + subtitle + time |
| 8.5 | `QuickActions.tsx` — 2×2 grid: Open Table / New Walk-in / View KDS / Floor Plan; hover: border-color → `--cl-primary` |
| 8.6 | Two-col layout: orders feed (flex-1) + alerts+actions (340px fixed right) |
| 8.7 | Update `web/src/routes/_authenticated/dashboard.tsx` |

**Files:** `web/src/components/dashboard/*.tsx`, `web/src/routes/_authenticated/dashboard.tsx`

**Store dependency:** `DashboardStore` created as part of B2. Access via `useDashboardStore()` hook. Existing route at `routes/_authenticated/dashboard.tsx` renders current placeholder — replace component reference here.

---

## T9 — Live Orders screen (Kanban)
**Depends on: T4, T7.**

| # | Subtask |
|---|---|
| 9.1 | `OrdersScreen.tsx` — flex column `height:calc(100vh - 92px)`; `PageHeader` + "New Order" primary btn |
| 9.2 | `ChannelFilter.tsx` — `FilterBar` prefix with "Filter" pill; All + 7 channels; active channel gets its own channel colour (not `--cl-dark`) |
| 9.3 | `OrderCard.tsx` — white card `borderRadius:12px`; red border when `col=preparing && time>15m`; header: id + `ChannelBadge` + clock (red if alert); items dot-list; footer: total + action btn (`OrderStore.advanceStatus`) |
| 9.4 | `OrderKanban.tsx` — `KanbanBoard` with 6 `KanbanColumn` instances; cards from `OrderStore.ordersByStatus`; horizontal scroll |
| 9.5 | Update `web/src/routes/_authenticated/orders/index.tsx` |

**Files:** `web/src/components/orders/*.tsx`, `web/src/routes/_authenticated/orders/index.tsx`

---

## T10 — Kitchen Display (KDS) screen
**Depends on: T4, T6, T7.**

| # | Subtask |
|---|---|
| 10.1 | `KdsScreen.tsx` — dark wrapper `#0D1520`, `borderRadius:16px`, `padding:20px`; header: title + LIVE dot + clock + branch/service + "⚠ 86 Alert" btn |
| 10.2 | `KdsStatsStrip.tsx` — 4 dark stat tiles (`#1A2840`): Active Tickets / Avg Time / Overdue >15m (red value) / Completed Today; reads `KdsStore` |
| 10.3 | `KdsTicket.tsx` — bg/border/time-colour all switch by elapsed (normal/≥10m/≥15m); header: id + table·channel + elapsed; divider; items: name + mod (↳) + `AllergenBadge` row in `rgba(255,255,255,0.04)` sub-card; action btn ("Acknowledge" or "✓ Mark Ready" green) |
| 10.4 | `AllergenBanner.tsx` — absolute bottom; red `#7F1D1D` bg, `#EF4444` border; countdown 30s → auto-dismiss; calls `KdsStore.acknowledgeAllergenAlert()` |
| 10.5 | `EightySixOverlay.tsx` — absolute full-screen overlay; red modal card: 🚫 + "86 ALERT" + item name + instruction + "Dismiss Alert" btn; triggered by `KdsStore.active86Event` |
| 10.6 | 3-col grid for tickets |
| 10.7 | Update `web/src/routes/_authenticated/kds.tsx` |

**Files:** `web/src/components/kds/*.tsx`, `web/src/routes/_authenticated/kds.tsx`

---

## T11 — Tables & Reservations screen
**Depends on: T4, T7.**

| # | Subtask |
|---|---|
| 11.1 | `TablesScreen.tsx` — two-panel flex: left (flex-1) + right sidebar (280px); header: title + subtitle (occupied/available counts) + Floor Plan / List View toggle + "Seat Walk-in" btn |
| 11.2 | `StateLegend.tsx` — row of state pills (Available/Occupied/Reserved/Cleaning/Blocked each with dot + count from `TableStore`) |
| 11.3 | `FloorCanvas.tsx` — scrollable `#FAFBFC` area; room label dividers (Main Dining / Bar Area / Private Dining); renders `TableNode` for each table in `TableStore` |
| 11.4 | `TableNode.tsx` — absolute positioned; round or rect based on shape; bg/border from TABLE_STATES; shows id + covers + guest name (truncated); selected: `scale(1.04)` + ring shadow |
| 11.5 | `TableDetailPanel.tsx` — top of right sidebar; table id + covers + state + guest info (name, seated time, bill total); 2×2 action grid (Seat, Clear, Merge [disabled], Split [disabled]) |
| 11.6 | `UpcomingReservations.tsx` — right sidebar section; time + name + covers·table + `StatusBadge`; reads `ReservationStore.upcomingToday` |
| 11.7 | `WalkInWaitlist.tsx` — right sidebar bottom; numbered circles + name + covers + wait time + "Seat" btn; reads waitlist endpoint |
| 11.8 | List view: inline `DataTable` (Guest / Date+Time / Covers / Table / Notes / Deposit / Status / actions) |
| 11.9 | Update `web/src/routes/_authenticated/reservations/index.tsx` |

**Files:** `web/src/components/reservations/TablesScreen.tsx`, `FloorCanvas.tsx`, `TableNode.tsx`, `StateLegend.tsx`, `TableDetailPanel.tsx`, `UpcomingReservations.tsx`, `WalkInWaitlist.tsx`; route index

---

## T12 — Events & Functions screen
**Depends on: T4, T7.**

| # | Subtask |
|---|---|
| 12.1 | `EventsScreen.tsx` — `TabBar` (Events Pipeline / Spaces / Packages / Corporate Accounts); `PageHeader` + "New Event" btn |
| 12.2 | `EventPipeline.tsx` — `KanbanBoard` + `KanbanColumn` ×4 (Enquiry grey / Proposal Sent indigo / Deposit Paid amber / Confirmed green); reads `EventStore.eventsByStage` |
| 12.3 | `EventCard.tsx` — white card: event name + date + guest count + contact + value (bold) + event id (small muted); hover shadow |
| 12.4 | Spaces / Packages / Corporate tabs: stub card "Coming soon" |
| 12.5 | Update `web/src/routes/_authenticated/events/index.tsx` |

**Files:** `web/src/components/events/*.tsx`, route index

---

## T13 — Menu Management screen
**Depends on: T4, T7.**

| # | Subtask |
|---|---|
| 13.1 | `MenuScreen.tsx` — flex column; `PageHeader` + "Add Item" btn; `TabBar` (Master Menu / Branch Overrides / 86 Manager / Platform Sync); "86 Manager" tab badge = count of 86'd items |
| 13.2 | `CategorySidebar.tsx` — 160px left column; category buttons with item count right-aligned; active: `--cl-dark` tinted bg; reads `MenuStore` |
| 13.3 | `MenuItemGrid.tsx` — search input + `auto-fill minmax(210px,1fr)` grid; filtered by category + search; reads `MenuStore.filteredItems` |
| 13.4 | `MenuItemCard.tsx` — 86'd: red-tinted bg + red border + "86'd" overlay badge on striped image placeholder; body: name + price + `AllergenBadge` row + status pill + Edit btn + Restore btn (86'd only) |
| 13.5 | `EightyManager.tsx` — alert banner + list of 86'd items (name + category + allergens + "Restore to Menu" btn); Restore opens `ConfirmModal`; on confirm: calls `MenuService.restore86(itemId)` |
| 13.6 | Platform Sync tab: stub card "Platform Sync — integration pending" |
| 13.7 | Branch Overrides tab: stub card (full feature is separate work) |
| 13.8 | Update `web/src/routes/_authenticated/menu/index.tsx` |

**Files:** `web/src/components/menu/*.tsx`, route index

---

## T14 — Inventory screen
**Depends on: T4, T7.**

| # | Subtask |
|---|---|
| 14.1 | `InventoryScreen.tsx` — `PageHeader` + "Add Item" btn |
| 14.2 | `InventoryStatsBar.tsx` — 4 plain-border stat tiles (not StatCard — no coloured bg): Total SKUs / Low Stock (amber) / Out of Stock (red) / Stock Value; reads `InventoryStore` |
| 14.3 | `InventoryTable.tsx` — `DataTable` cols: Ingredient / Category / Unit / Current Stock / Par Level / WAC Cost / Status; row bg: red-tinted for `out`, amber-tinted for `low`; name cell appends "AUTO 86" red badge when `out`; stock cell coloured by status; status cell: `StatusBadge` |
| 14.4 | Update `web/src/routes/_authenticated/inventory/index.tsx` |

**Files:** `web/src/components/inventory/InventoryScreen.tsx`, `InventoryStatsBar.tsx`, `InventoryTable.tsx`; route index

---

## T15 — Customers & Loyalty screen
**Depends on: T4, T7.**

| # | Subtask |
|---|---|
| 15.1 | `CustomersScreen.tsx` — `PageHeader` + "Add Customer" btn |
| 15.2 | `CustomersStatsBar.tsx` — 3-col plain-border stat tiles: Total Customers / Active Loyalty Members / Avg Points Balance; reads `CustomerStore` |
| 15.3 | `CustomersTable.tsx` — `DataTable` cols: Customer (gradient avatar initials + name) / Email / Loyalty Tier (`StatusBadge` variant: 🥇 Gold / 🥈 Silver / 🥉 Bronze) / Points / Visits / Last Visit; hover row tint |
| 15.4 | Update `web/src/routes/_authenticated/customers/index.tsx` |

**Files:** `web/src/components/customers/*.tsx`, route index

---

## T16 — Staff Management screen
**Depends on: T4, T7.**

| # | Subtask |
|---|---|
| 16.1 | `StaffScreen.tsx` — master-detail flex: left panel `width: selected ? 400px : 100%` with `transition:width 0.2s`; right: `StaffProfilePanel` when row selected |
| 16.2 | Left header: `PageHeader` (active count + doc warning count, "Add Staff" btn) + `FilterBar` (All / Active / Inactive) |
| 16.3 | `StaffTable.tsx` — `DataTable` cols: Staff Member (avatar + name) / Role (badge from ROLE_COLORS) / Branch / Status badge / Docs (⚠ amber or ✓ green) / chevron; row click selects; selected row gets `--cl-dark` tinted bg; hover uses inline opacity (fixes `t.hover` design bug) |
| 16.4 | `StaffProfilePanel.tsx` — right panel: avatar (56px gradient) + name + role badge + X close btn; `TabBar` (Profile / Documents / Permissions) |
| 16.5 | Profile tab: 2×2 info tiles (Branch / Status / Joined / Email) — `#FAFAFA` bordered tiles |
| 16.6 | `DocumentList.tsx` — items: clipboard icon + name + expiry + `StatusBadge` (Valid/Expiring) + Upload btn; expiring row: amber bg + amber border; "Add Document" dashed btn |
| 16.7 | `PermissionsPanel.tsx` — list of permission rows: label + visual toggle switch (read-only display — permissions are role-driven); green=granted, grey=not granted |
| 16.8 | Update `web/src/routes/_authenticated/staff/index.tsx` |

**Files:** `web/src/components/staff/*.tsx`, route index

---

## T17 — Analytics & Reports screen
**Depends on: T4, T7.**

| # | Subtask |
|---|---|
| 17.1 | `AnalyticsScreen.tsx` — scrollable `height:calc(100vh - 92px)`; `PageHeader` + range toggle (1M/3M/6M/1Y) + "Export" outline btn |
| 17.2 | `KpiCards.tsx` — 3-col: Total Revenue / Total Covers / Avg Spend per Cover; each: label + value (28px bold) + delta (↑/↓ % green/red); reads `AnalyticsStore` (calls `GET /api/v1/analytics/dashboard/branch`) |
| 17.3 | `RevenueChart.tsx` — pure SVG `viewBox="0 0 100 {h}" preserveAspectRatio="none"`; `<linearGradient>` fill (colour at 15% → transparent) + `<polygon>` fill + `<polyline>` stroke; month labels row below |
| 17.4 | `ChannelDonut.tsx` — SVG donut `r=38 cx=50 cy=50 strokeWidth=18`; grey bg circle + coloured stroke-dasharray segments with cumulative rotation; "Orders" centre text; legend list beside |
| 17.5 | `TopDishes.tsx` — ranked list: # + name + revenue + progress bar (5px, gradient `--cl-primary`→`--cl-dark` at `pct%`); reads `AnalyticsStore` |
| 17.6 | `RfmSegments.tsx` — 2×2 grid of segment cards: value + label + description + delta; reads `AnalyticsStore` (calls `GET /api/v1/analytics/dashboard/customer`); mock data if endpoint not yet wired |
| 17.7 | `StaffPerformance.tsx` — list: gradient avatar + name + role + covers + ★ rating + revenue; mock data (no per-staff analytics endpoint yet) |
| 17.8 | Update `web/src/routes/_authenticated/analytics/index.tsx` |

**Files:** `web/src/components/analytics/*.tsx`, route index

---

## T18 — Asset cleanup
**Depends on: T4, T5, T8–T17 (all screens complete).**

| # | Subtask |
|---|---|
| 18.1 | Delete `web/src/assets/hero.png` |
| 18.2 | Delete `web/src/assets/vite.svg` |
| 18.3 | Delete or clear `web/public/login-bg.png` (login uses CSS gradient now) — remove all references; currently referenced at `LoginPage.tsx:34` |
| 18.4 | Delete `web/src/components/layout/UserMenu.tsx` — replaced by `UserDropdown.tsx` |
| 18.5 | Delete `web/src/components/layout/BranchSwitcher.tsx` — integrated into `Sidebar.tsx` |
| 18.6 | Delete `web/src/components/layout/AppFooter.tsx` — inline in AppShell |
| 18.7 | Delete `web/src/components/auth/ForgotPasswordPage.tsx` — folded into `LoginPage.tsx` |
| 18.8 | Delete `web/src/components/layout/NotificationBell.tsx` — replaced by `NotifDropdown.tsx` in T3 |
| 18.9 | Update `web/src/routes/forgot-password.tsx` — replace with redirect to `/login` (route still registered in `routeTree.gen.ts`; do not delete) |
| 18.10 | Run `npm run lint` — verify no broken imports |
| 18.11 | Run `npm run test` — verify no regressions |

---

## Verification

1. `npm run dev` in /web — visually compare each screen against UI/*.jsx
2. `npm run lint` — zero TypeScript errors
3. `npm run test` — existing tests pass
4. `php artisan test` in /api — all backend tests pass including new B1–B5 tests
5. Theme switch (Ocean/Forest/Sunrise) updates sidebar + header colours
6. Cookie value `sunrise` read back correctly after rename
7. KDS dark bg `#0D1520` independent of theme
8. Login: all 6 screens reachable; OTP send → verify flow works end-to-end (B1)
9. Dashboard stat cards show live counts from `GET /api/v1/dashboard/operational` (B2)
10. Messages dropdown shows channel list from API, unread badge updates on new message (B3)
11. Notifications dropdown pulls from API; mark-all-read clears badge (B4)
12. Onboarding wizard: all 3 steps complete; "Skip for now" on step 2 works (B5)
