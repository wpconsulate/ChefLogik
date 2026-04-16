# ChefLogik — Frontend Implementation Plan

## Current State
- **Backend: Phase 1 + Phase 2 + Phase 3 COMPLETE** (306 tests passing)
- **Frontend: Modules 1, 2, 3, 4, 5 & 8 COMPLETE** (15 tests passing)
- Frontend lives at `/web` (React 19 + TypeScript strict + MobX-State-Tree + TanStack Router + shadcn/ui)

### Auth Fix Applied
- Login form now includes **Restaurant ID** (`tenant_id`) field — required by the backend staff login endpoint
- All auth API paths corrected: `/v1/auth/staff/login`, `/v1/auth/staff/logout`, `/v1/auth/staff/me`
- `AuthStore.login()` signature updated to `login(email, password, tenantId)`

---

## Ground Rules

- All server state in MST stores — never `useState` for API data
- No `any` types — TypeScript strict mode throughout
- All API calls via the typed `ApiService` class — no direct `fetch` in components
- All privileged UI gates on `authStore.can('permission.slug')`
- WebSocket events (Reverb) flow into stores directly
- Functional components only

---

## ✓ Module 1 — Foundation & Auth — DONE (15 tests passing)

### Scaffolding
- [x] Vite + React 19 + TypeScript strict mode project setup
- [x] MST installed (`mobx`, `mobx-react-lite`, `mobx-state-tree`)
- [x] Axios `ApiService` — base URL `/api/v1`, auth + `X-Branch-Id` headers, 401 global handler
- [x] `RootStore` with `AuthStore` wired
- [x] `StoreContext` + `useStore()` / `useAuth()` hooks
- [ ] Laravel Echo + Pusher-js client (wired to Reverb on port 8080) — deferred to Module 4 (Orders)

### AuthStore + Auth UI
- [x] `AuthStore` — login, logout, rehydrate, permissions array, `can()` / `canAny()` / `canAll()` views
- [x] `PermissionGate` component — renders children only if `authStore.can(slug)`
- [x] Login page (staff guard — `/login`) — email + password + tenant_id
- [x] Token persistence (localStorage) + rehydration on load
- [x] `me` endpoint fetch on app boot (populate permissions, branchIds, tenantId)
- [x] Branch switcher (sets `currentBranchId`, updates `X-Branch-Id` header)
- [x] Logout flow (clear all stores, redirect to login)
- [x] Protected route wrapper (`/_authenticated` layout — redirects unauthenticated users)

### API endpoints used
```
POST /v1/auth/staff/login   { email, password, tenant_id }
POST /v1/auth/staff/logout
GET  /v1/auth/staff/me
```

---

## ✓ Module 2 — Branch & Staff Management — DONE (15 tests passing)

### StaffStore
- [x] `StaffStore` — staff list, CRUD actions, role assignment, role builder, permissions fetch
- [x] `BranchStore` — branch list, CRUD actions

### Pages / Components
- [x] Branch list page (gated: `branches.view`)
- [x] Create / edit branch form (gated: `branches.create` / `branches.edit`)
- [x] Staff list page (gated: `staff.view_all`)
- [x] Create staff form — `role_id` sent with creation payload; role assignment is atomic (single API call, no separate assign step) (gated: `staff.manage` / `staff.create`)
- [x] Staff detail — offboard, role assignment / revocation (gated: `roles.assign`)
- [x] Role list page (gated: `roles.view`)
- [x] Role create/edit pages with `PermissionPicker` component (gated: `roles.create` / `staff.manage_roles`)
- [x] `PermissionPicker` component — grouped checkboxes with module-level select-all
- [x] `Input` UI component (shared)
- [x] AppShell nav — corrected all permission slugs to match backend

### API endpoints used
```
GET/POST/PATCH/DELETE  /branches
GET/POST/PATCH         /staff
POST                   /staff/{id}/offboard
GET/POST               /staff/{id}/roles
DELETE                 /staff/{id}/roles/{roleId}
GET/POST/PATCH/DELETE  /staff/roles
GET                    /staff/permissions
```

---

## ✓ Module 4 — Orders (Live Dashboard) — DONE

### OrderStore
- [x] `OrderStore` — orders map, `byStatus` Kanban view, `activeForBranch`, `historyOrders`
- [x] WebSocket: subscribe to `tenant.{id}.branch.{id}.orders` for `OrderStatusChanged`, `NewOrderReceived` → `_upsertOrder`
- [x] Laravel Echo + Pusher-js wired to Reverb (port 8080) — `initEcho` / `disconnectEcho` in AuthStore

### Pages / Components
- [x] Live order Kanban board — 7 columns (new → confirmed → preparing → ready → out_for_delivery → served → bill_settled) with elapsed timers, 30s auto-refresh (gated: `orders.view`)
- [x] Order card — source badge, customer name, table, allergen highlight (red), status transition buttons (gated: `orders.modify`), cancel button (gated: `orders.cancel`)
- [x] Cancel dialog on Kanban card — reason code dropdown + optional note
- [x] New order form — source selector, table ID, customer details, allergen note, line items with qty/price/instructions (gated: `orders.create`)
- [x] Order history page — date range, status/source filters, paginated table, link to detail (gated: `orders.view`)
- [x] Order detail page — full item list with modifiers, totals breakdown, status badge, cancel form, status history timeline, transition buttons (gated: `orders.modify`)

### API endpoints used
```
GET/POST             /orders
GET                  /orders/{id}
POST                 /orders/{id}/status
POST                 /orders/{id}/cancel
```

---

## ✓ Module 3 — Menu Management — DONE

### MenuStore
- [x] `MenuStore` — categories (map), items (map), branch overrides (keyed `{itemId}:{branchId}`), active 86 logs, latestAlert for toast
- [x] WebSocket: subscribe to `tenant.{id}.menu` for `ItemAvailabilityChanged` → update store (ready when backend adds `ShouldBroadcast` to the event)

### Pages / Components
- [x] `/menu` — category sidebar + item list, inline 86 toggle/restore per branch, 86 alert toast (gated: `menu.view`)
- [x] `/menu/items/new` — create item form with allergens, dietary flags, prep time (allergen section gated: `menu.edit_allergens`)
- [x] `/menu/items/$itemId` — 4-tab detail page:
  - [x] **Details** — edit item form (gated: `menu.manage`; allergens read-only for non-owners)
  - [x] **Modifier Groups** — attach/detach modifier groups (gated: `menu.manage`)
  - [x] **Branch Overrides** — per-branch price override, availability, visibility (gated: `menu.manage`)
  - [x] **86 Management** — branch-scoped 86/restore, stockout distinction, history log (gated: `menu.86_item`)
- [x] Real-time 86 toast notification (5-second auto-dismiss, via WebSocket)

### API endpoints used
```
GET/POST             /menu/categories
PUT/DELETE           /menu/categories/{id}
GET/POST             /menu/items
GET/PUT/DELETE       /menu/items/{id}
POST/DELETE          /menu/items/{id}/modifier-groups/{groupId}
GET/PUT/DELETE       /menu/items/{id}/overrides/{branchId}
POST                 /menu/items/{id}/86
POST                 /menu/items/{id}/restore/{logId}
GET                  /menu/items/{id}/86/history
GET                  /menu/modifier-groups
```


## Module 7 — Inventory & Kitchen (KDS)

### InventoryStore
- [ ] `InventoryStore` — stock items, recipes, GRNs, waste logs, stocktakes
- [ ] `KdsStore` — active KDS tickets
- [ ] WebSocket: subscribe to `tenant.{id}` for `KdsTicketCreated`, `KdsTicketUpdated`, `AllergenAcknowledged` events

### Pages / Components
- [ ] Stock item list + CRUD (gated: `inventory.manage`)
- [ ] Recipe list + CRUD with ingredient linkage (gated: `inventory.manage`)
- [ ] GRN form — supplier, line items, temperature log (gated: `inventory.grn`)
- [ ] Waste log form — item, quantity, waste type, reason (gated: `inventory.waste`)
- [ ] Stocktake workflow — count entry per item, submit for variance report (gated: `inventory.stocktake`)
- [ ] KDS screen — real-time ticket queue, allergen acknowledgement button with 30s countdown (gated: `kitchen.kds`)
- [ ] WAC costing view — per-item and per-recipe cost breakdown (gated: `inventory.view`)

### API endpoints used
```
GET/POST/PUT/DELETE  /inventory/items
GET/POST/PUT/DELETE  /inventory/recipes
GET/POST             /inventory/grns
GET/POST             /inventory/waste-logs
GET/POST             /inventory/stocktakes
GET                  /kds/tickets
POST                 /kds/tickets/{id}/acknowledge
POST                 /kds/tickets/{id}/complete
```

---

## ✓ Module 8 — Events & Functions — DONE

### EventStore
- [x] `EventStore` — enquiries, proposals, bookings, run sheets, tasks, spaces, packages, corporate accounts

### Pages / Components
- [x] Enquiry pipeline board — Kanban by stage (enquiry → proposal → deposit → confirmed → pre_event → day_of → completed) (gated: `events.view`)
- [x] New enquiry form — client details, event type, date, guest count, spaces, packages, corporate account (gated: `events.create`)
- [x] Event detail page — 3 tabs: Details (edit form, financials), Tasks (checklist + add dialog), Run Sheet (gated: `events.view`)
- [x] Lifecycle transitions — send-proposal, confirm, pre-event, day-of, complete, mark-lost, cancel (gated: `events.manage`)
- [x] Corporate accounts list + CRUD — credit limit, outstanding balance, hold/reactivate (gated: `events.manage`)
- [x] Event spaces management — capacity, min spend, deposit config (gated: `events.manage`)
- [x] Event packages management — price per head, min guests, includes list (gated: `events.manage`)

### API endpoints used
```
GET/POST             /events
GET/PATCH            /events/{id}
POST                 /events/{id}/send-proposal
POST                 /events/{id}/confirm
POST                 /events/{id}/cancel
POST                 /events/{id}/mark-lost
POST                 /events/{id}/pre-event
POST                 /events/{id}/day-of
POST                 /events/{id}/complete
GET/POST             /events/{id}/tasks
PATCH                /events/{id}/tasks/{task_id}
GET                  /events/{id}/run-sheet
GET/POST/PATCH/DELETE /events/spaces
GET/POST/PATCH/DELETE /events/packages
GET/POST/PATCH       /events/corporate-accounts
POST                 /events/corporate-accounts/{id}/hold
POST                 /events/corporate-accounts/{id}/reactivate
```

---

## Module 9 — Analytics Dashboards

### AnalyticsStore
- [ ] `AnalyticsStore` — fetches pre-aggregated dashboard data

### Dashboards (all gated on `analytics.view`)
- [ ] **Owner Dashboard** — revenue (daily/weekly/monthly), orders by channel, top items, CLV trend, RFM segment distribution
- [ ] **Branch Dashboard** — per-branch revenue, covers, ATV, kitchen throughput
- [ ] **Kitchen Dashboard** — ticket volume, avg prep time, allergen incident log
- [ ] **Events Dashboard** — enquiry conversion rate, deposit collected, upcoming events
- [ ] **Customer Dashboard** — new vs returning, churn risk list, top loyalty earners

### API endpoints used
```
GET  /analytics/owner-dashboard
GET  /analytics/branch-dashboard
GET  /analytics/kitchen-dashboard
GET  /analytics/events-dashboard
GET  /analytics/customer-dashboard
GET  /analytics/rfm-segments
```

---

## Module 10 — Platform Admin Panel

### PlatformStore (separate auth guard — platform_admin)
- [ ] `PlatformStore` — tenants, plans, impersonation

### Pages / Components (all require platform-admin token)
- [ ] Tenant list — name, plan, branch count, active/suspended status
- [ ] Tenant detail — usage stats (orders/reservations/events/customers), impersonate button
- [ ] Impersonate action — launches 1-hour owner token, shown in banner
- [ ] Suspend / reactivate tenant — with confirmation dialog
- [ ] Subscription plan listing

### API endpoints used (platform guard)
```
GET              /platform/tenants
GET              /platform/tenants/{id}
GET              /platform/tenants/{id}/usage
POST             /platform/tenants/{id}/impersonate
POST             /platform/tenants/{id}/suspend
POST             /platform/tenants/{id}/reactivate
GET              /platform/plans
```

---

## Module 6 — Customer Profiles & Loyalty

### CustomerStore
- [ ] `CustomerStore` — profile list, search/dedup, loyalty data

### Pages / Components
- [ ] Customer search (phone / email / name) with dedup indicator (gated: `customers.view`)
- [ ] Customer profile page — personal details, visit history, loyalty points balance, tier badge (gated: `customers.view`)
- [ ] Loyalty points adjust form — earn / redeem / manual adjust with reason (gated: `customers.loyalty-manage`)
- [ ] GDPR panel — consent log, right-to-access export, erasure request (gated: `customers.gdpr`)
- [ ] Staff enrolment flow — create profile at point of contact (gated: `customers.create`)

### API endpoints used
```
GET/POST             /customers
GET/PUT              /customers/{id}
GET                  /customers/{id}/loyalty
POST                 /customers/{id}/loyalty/adjust
POST                 /customers/{id}/loyalty/redeem
POST                 /customers/{id}/gdpr/erasure
GET                  /customers/{id}/gdpr/export
```

---

---

## ✓ Module 5 — Table & Reservation Management — DONE

### Stores
- [x] `TableStore` — tables map, floor plans, WebSocket subscription to `tenant.{id}.branch.{id}.tables` → `TableStatusChanged`
- [x] `ReservationStore` — reservations map, waitlist, availability slots

### Pages / Components
- [x] `/reservations` — list with date + status filters, sortable table (gated: `reservations.view`)
- [x] `/reservations/new` — form with party size, date/time, guest details + inline availability check → table selector (gated: `reservations.create`)
- [x] `/reservations/$reservationId` — detail with lifecycle actions: arrive, seat (table picker dialog), complete, no-show, cancel (gated: `reservations.manage`)
- [x] `/reservations/floor-plan` — colour-coded table grid (free=green, reserved=blue, occupied=red, cleaning=amber, blocked=gray), click-to-act dialog with seat/clear/block/unblock, add-table form, WebSocket live updates (gated: `tables.manage`)
- [x] `/reservations/waitlist` — active queue with walk-in add form, seat-from-waitlist dialog, leave action; historical panel for today (gated: `reservations.manage`)

### API endpoints used
```
GET/POST/PUT/DELETE  /branches/{id}/tables
POST                 /branches/{id}/tables/{id}/status
POST                 /branches/{id}/tables/{id}/block
POST                 /branches/{id}/tables/{id}/unblock
GET/POST             /branches/{id}/floor-plans
GET/PUT/DELETE       /branches/{id}/floor-plans/{id}
GET/POST             /reservations
GET/PUT              /reservations/{id}
POST                 /reservations/{id}/arrive
POST                 /reservations/{id}/seat
POST                 /reservations/{id}/complete
POST                 /reservations/{id}/no-show
POST                 /reservations/{id}/cancel
GET                  /reservations/availability
GET/POST             /branches/{id}/waitlist
POST                 /branches/{id}/waitlist/{id}/seat
POST                 /branches/{id}/waitlist/{id}/leave
```

---

## Module 11 — Customer Portal (separate SPA or route group)

### CustomerAuthStore (customer guard)
- [ ] Customer login / logout
- [ ] Tenant selection (restaurant picker after login)
- [ ] Loyalty dashboard — points balance, tier, recent transactions
- [ ] Reservation history — upcoming + past, cancel option
- [ ] Event booking history — upcoming + past
- [ ] GDPR self-service — data export, erasure request

### API endpoints used (customer guard)
```
POST  /customer/auth/login
POST  /customer/auth/logout
GET   /customer/auth/me
GET   /customer/portal/loyalty
GET   /customer/portal/reservations
GET   /customer/portal/events
POST  /customer/portal/gdpr/erasure
GET   /customer/portal/gdpr/export
```

---

## Implementation Order

1. **✓ Module 1** — Foundation & Auth — DONE
2. **✓ Module 2** — Branch & Staff Management — DONE
3. **✓ Module 4** — Orders Live Dashboard — DONE
4. **✓ Module 3** — Menu Management — DONE
5. **✓ Module 5** — Table & Reservation Management — DONE
6. **Module 7** — Inventory & KDS ← NEXT
7. **Module 6** — Customer Profiles & Loyalty
8. **✓ Module 8** — Events & Functions — DONE
9. **Module 9** — Analytics Dashboards
10. **Module 10** — Platform Admin Panel
11. **Module 11** — Customer Portal
