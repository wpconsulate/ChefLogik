# ChefLogik — What's Completed & How to Test

## Current Test State
**306 tests, 306 passing** (backend — run from `/api` directory)
**15 tests, 15 passing** (frontend — run from `/web` directory)

> Frontend modules completed: Foundation & Auth (Module 1), Branch & Staff Management (Module 2), Orders Live Dashboard (Module 4), Menu Management (Module 3), Events & Functions (Module 8), Table & Reservation Management (Module 5)
```bash
cd /Users/deepak/Projects/ChefLogik/api
php artisan test
```

> Note: 3 tests hit Redis for permission-cache assertions. If Redis is unavailable they will fail. All other tests use a real Postgres test DB.

---

## Completed Modules

### 1. Tenancy Infrastructure
**What it does:** Every query is automatically scoped to the authenticated tenant. No cross-tenant data leakage is possible.

- `TenantScope` global scope — auto-filters all queries by `resolved_tenant_id`
- `HasTenantScope` trait — applied to every tenant-scoped model; auto-sets `tenant_id` on create
- `TenantMiddleware` — reads tenant from auth token, stamps `resolved_tenant_id` on request
- Cross-tenant `abort_if` checks on every bound-model controller action

**Test:** `php artisan test --filter TenantScopeTest`

---

### 2. Authentication — Three Guards

#### Staff Auth (`auth:staff`)
Tenant-scoped staff login. Returns an 8-hour Sanctum token with embedded permissions and branch access.

```
POST /api/v1/auth/staff/login
{ "email": "...", "password": "...", "tenant_id": "<uuid>" }

POST /api/v1/auth/staff/logout        (requires Bearer token)
POST /api/v1/auth/staff/refresh       (requires Bearer token)
GET  /api/v1/auth/staff/me            (requires Bearer token)
```

#### Platform Admin Auth (`auth:platform`)
Global admin — manages tenants across the whole platform.

```
POST /api/platform/auth/login
{ "email": "admin@cheflogik.com", "password": "changeme-in-production" }

POST /api/platform/auth/logout
GET  /api/platform/auth/me
```

#### Customer Auth (`auth:customer`)
Platform-level customer accounts. Customer selects a restaurant after login.

```
POST /api/v1/customer/auth/login
POST /api/v1/customer/auth/logout
GET  /api/v1/customer/auth/restaurants
POST /api/v1/customer/auth/select       (select a restaurant, get scoped token)
GET  /api/v1/customer/auth/me
```

**Test:** `php artisan test --filter AuthServiceTest`

---

### 3. Permissions & Roles

Dynamic role system. 80 permissions across all modules. 8 system roles seeded.

**System roles:** `owner`, `branch_manager`, `events_manager`, `head_chef`, `chef_de_partie`, `waiter`, `host`, `kitchen_porter`

All permission checks use `Gate::check('permission.slug')` — never role-name strings.
Permission list is cached in Redis (`perms:{tenant_id}:{user_id}`, 5-min TTL).

```
GET    /api/v1/staff/permissions                    list all permissions (grouped by module)
GET    /api/v1/staff/roles                          list roles for tenant
POST   /api/v1/staff/roles                          create custom role
GET    /api/v1/staff/roles/{role}                   show role + permissions
PUT    /api/v1/staff/roles/{role}                   update role (system roles blocked)
DELETE /api/v1/staff/roles/{role}                   delete role (system or in-use roles blocked)

GET    /api/v1/staff/{user}/roles                   list roles assigned to staff member
POST   /api/v1/staff/{user}/roles                   assign role to staff member
DELETE /api/v1/staff/{user}/roles/{role}            revoke role from staff member
```

**Test:** `php artisan test --filter "RoleBuilderTest|RoleAssignmentTest"`

**Key behaviours:**
- Privilege escalation check on both role creation and role assignment — actor cannot grant/assign permissions they don't hold themselves
- System roles cannot be deleted or modified
- Roles in use (assigned to staff) cannot be deleted
- Role assignment is idempotent (`updateOrCreate`) — re-assigning the same role updates rather than duplicates
- `branch_ids = null` means all branches (owner-scope); pass a UUID array to scope to specific branches
- Staff must retain at least one role — last-role guard enforced on revoke
- Permission cache invalidated on role update (`perms:{tenant_id}:{user_id}`, 5-min TTL)

---

### 4. Branch Management

Full CRUD for restaurant branches. Each branch has operating hours and optional special hours overrides.

```
GET    /api/v1/branches                       list branches
POST   /api/v1/branches                       create branch
GET    /api/v1/branches/{branch}              show branch
PUT    /api/v1/branches/{branch}              update branch
DELETE /api/v1/branches/{branch}              delete branch

GET    /api/v1/branches/{branch}/hours        list special hours
POST   /api/v1/branches/{branch}/hours        upsert special hour (date-based)
DELETE /api/v1/branches/{branch}/hours/{id}   delete special hour
```

**Test:** `php artisan test --filter BranchCrudTest`

---

### 5. Staff Management

Full staff lifecycle — hire, schedule, clock in/out, offboard.

```
GET    /api/v1/staff                          list staff
POST   /api/v1/staff                          create staff member
GET    /api/v1/staff/{user}                   show staff member
PUT    /api/v1/staff/{user}                   update staff member
DELETE /api/v1/staff/{user}                   delete staff member
POST   /api/v1/staff/{user}/offboard          offboard (sets status=offboarded)
POST   /api/v1/staff/{user}/documents         upload document

GET    /api/v1/staff/shifts                   list shifts
POST   /api/v1/staff/shifts                   create shift
GET    /api/v1/staff/shifts/{shift}           show shift
PUT    /api/v1/staff/shifts/{shift}           update shift
DELETE /api/v1/staff/shifts/{shift}           delete shift
POST   /api/v1/staff/shifts/{shift}/claim     claim an open shift

POST   /api/v1/staff/clock-in                 clock in
POST   /api/v1/staff/clock-out                clock out
GET    /api/v1/staff/attendance               list attendance records
GET    /api/v1/staff/payroll/export           export payroll CSV
```

**Test:** `php artisan test --filter StaffLifecycleTest|ShiftsTest|AttendanceTest`

---

### 6. Menu Management

Full menu system: categories, items, modifiers, branch-level overrides, and 86 management.

#### Categories
```
GET    /api/v1/menu/categories                list categories
POST   /api/v1/menu/categories                create category
GET    /api/v1/menu/categories/{id}           show category
PUT    /api/v1/menu/categories/{id}           update category
DELETE /api/v1/menu/categories/{id}           delete category
```

#### Menu Items
```
GET    /api/v1/menu/items                     list items (filters: category_id, is_active, is_master)
POST   /api/v1/menu/items                     create item
GET    /api/v1/menu/items/{id}                show item (with modifier groups)
PUT    /api/v1/menu/items/{id}                update item
DELETE /api/v1/menu/items/{id}                delete item

POST   /api/v1/menu/items/{id}/86             mark item as 86'd for a branch
POST   /api/v1/menu/items/{id}/restore/{log}  restore 86'd item (inventory_stockout requires manager_confirmed=true)
GET    /api/v1/menu/items/{id}/86/history     get 86 history (?branch_id=<uuid>)
```

#### Modifier Groups
```
GET    /api/v1/menu/modifier-groups           list modifier groups
POST   /api/v1/menu/modifier-groups           create group (with inline modifiers)
GET    /api/v1/menu/modifier-groups/{id}      show group
PUT    /api/v1/menu/modifier-groups/{id}      update group (replace modifiers if provided)
DELETE /api/v1/menu/modifier-groups/{id}      delete group

POST   /api/v1/menu/items/{item}/modifier-groups/{group}    attach group to item
DELETE /api/v1/menu/items/{item}/modifier-groups/{group}    detach group from item
```

#### Branch Overrides
```
GET    /api/v1/menu/items/{item}/overrides              list overrides for item
PUT    /api/v1/menu/items/{item}/overrides/{branch}     upsert override (price, availability, description, photo, visibility)
DELETE /api/v1/menu/items/{item}/overrides/{branch}     remove override (reverts to master)
```

#### Public Menu (no auth)
```
GET    /api/public/menu/{branchId}            full menu with overrides applied (for QR menus, kiosk displays)
```

**Test:** `php artisan test --filter MenuItemTest|EightySixTest|ModifierTest|EightySixServiceTest`

---

### 7. Platform Admin — Tenant Management

Creating a tenant auto-provisions the first business owner: generates a temporary password, assigns the `owner` system role with all permissions, and dispatches a welcome email.

```
GET    /api/platform/tenants                  list all tenants
POST   /api/platform/tenants                  create tenant + first owner (requires owner_name, owner_email)
GET    /api/platform/tenants/{tenant}         show tenant
PUT    /api/platform/tenants/{tenant}         update tenant
DELETE /api/platform/tenants/{tenant}         soft-cancel tenant (status → cancelled)
```

`POST /api/platform/tenants` required fields:
```json
{
  "name":        "The Crown Restaurant",
  "slug":        "the-crown",
  "plan_id":     "<uuid>",
  "owner_name":  "James Whitfield",
  "owner_email": "james@thecrown.com"
}
```

Response includes `temp_password` — shown once, owner must change on first login.

```
POST   /api/v1/staff/owners                   create additional co-owner (requires owners.manage permission)

GET    /api/platform/tenants/{id}/stats       usage stats (branches, staff, orders, customers, reservations, events)
POST   /api/platform/tenants/{id}/impersonate 1-hour owner token for support (idempotent, audit logged)
POST   /api/platform/tenants/{id}/suspend     suspend with optional reason (audit logged)
POST   /api/platform/tenants/{id}/reactivate  reactivate from suspended (audit logged)
GET    /api/platform/plans                    list all subscription plans
GET    /api/platform/plans/{id}               show single plan
```

**Test:** `php artisan test --filter "TenantProvisioningTest|OwnerManagementTest|PlatformAdminPanelTest"`

**Key behaviours:**
- Impersonation is idempotent: calling it again revokes the previous impersonation token for that admin+tenant pair, then issues a fresh 1-hour one
- The impersonation token is a real Sanctum staff token — it works on all `/api/v1/*` staff endpoints
- Suspend/reactivate block invalid transitions (422 with a clear message)
- Every impersonate/suspend/reactivate writes an immutable entry to `audit_log`
- Plan switching: `PUT /api/platform/tenants/{id}` already accepts `plan_id`; `/plans` provides the list for the admin UI dropdown

---

### 8. Orders & Deliveries

**What it does:**
- Full order lifecycle: `new → confirmed → preparing → ready → served → bill_settled → completed`
- Cancel at any non-terminal stage with a reason code
- Order ref generation (`ORD-YYYYMMDD-NNNN`)
- Total calculation: subtotal + delivery_fee + service_charge − discount_amount
- Item snapshots — name, SKU, price locked at order time
- Status history audit trail in `order_status_history`
- Tenant isolation — orders are scoped to the authenticated tenant
- Delivery zone management with pause/activate support
- Stub jobs wired up: `DeductStockJob` (critical queue on confirm), `IssueLoyaltyPointsJob` (on complete), `SyncOrderToPlatformsJob` (platform orders)
- Broadcast events for real-time order dashboard: `OrderStatusChanged`, `NewOrderReceived` on private channel `tenant.{id}.branch.{id}.orders`
- `RefundEngine` stub — ready to wire Stripe once Decision 7 is confirmed

**Test:** `php artisan test --filter="OrderLifecycleTest|DeliveryZoneTest"`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/orders` | Create order |
| `GET` | `/api/v1/orders` | List orders (filters: branch_id, status, source, date_from, date_to) |
| `GET` | `/api/v1/orders/{id}` | Get order detail |
| `POST` | `/api/v1/orders/{id}/status` | Transition status |
| `POST` | `/api/v1/orders/{id}/cancel` | Cancel with reason |
| `GET` | `/api/v1/branches/{branch}/delivery-zones` | List delivery zones |
| `POST` | `/api/v1/branches/{branch}/delivery-zones` | Create delivery zone |
| `GET` | `/api/v1/branches/{branch}/delivery-zones/{zone}` | Get zone |
| `PUT` | `/api/v1/branches/{branch}/delivery-zones/{zone}` | Update zone |
| `DELETE` | `/api/v1/branches/{branch}/delivery-zones/{zone}` | Delete zone |
| `POST` | `/api/v1/branches/{branch}/delivery-zones/{zone}/pause` | Pause zone |
| `POST` | `/api/v1/branches/{branch}/delivery-zones/{zone}/activate` | Activate zone |

---

### 9. Table & Reservation Management ✓ (Phase 2 — Module 1)

**What it does:**
- Floor plan CRUD per branch (JSON layout_data for canvas rendering)
- Table CRUD with state machine: `free → reserved → occupied → needs_cleaning → blocked`
- Invalid transitions return 409
- Block/unblock tables (manager action)
- WebSocket broadcast on every table state change → `tenant.{id}.branch.{id}.tables`
- Reservation lifecycle: `confirmed → arrived → seated → completed` + `no_show` / `cancelled`
- Seating links a table to a reservation and transitions both at once
- No-show increments `customer_profiles.no_show_count`
- Availability algorithm: checks operating hours (special hours take precedence), finds tables by party size, filters out overlapping reservations
- 24h + 2h reminder jobs dispatched on creation (SMS stubs — blocked on Decision 8)
- Waitlist: add party, seat from waitlist (transitions table to occupied), mark left
- Walk-in profile matching by phone (E.164 normalised): match / no-match / multiple

**Test:** `php artisan test --filter="ReservationLifecycleTest|WalkInMatchingTest"`

#### Floor Plans
```
GET    /api/v1/branches/{branch}/floor-plans              list floor plans
POST   /api/v1/branches/{branch}/floor-plans              create floor plan
GET    /api/v1/branches/{branch}/floor-plans/{plan}       show (with tables)
PUT    /api/v1/branches/{branch}/floor-plans/{plan}       update
DELETE /api/v1/branches/{branch}/floor-plans/{plan}       delete
```

#### Tables
```
GET    /api/v1/branches/{branch}/tables                   list tables (filters: floor_plan_id, status)
POST   /api/v1/branches/{branch}/tables                   create table
GET    /api/v1/branches/{branch}/tables/{table}           show table
PUT    /api/v1/branches/{branch}/tables/{table}           update table
DELETE /api/v1/branches/{branch}/tables/{table}           delete table
POST   /api/v1/branches/{branch}/tables/{table}/status    transition status
POST   /api/v1/branches/{branch}/tables/{table}/block     block table
POST   /api/v1/branches/{branch}/tables/{table}/unblock   unblock table
```

#### Reservations
```
GET    /api/v1/reservations/availability              check available slots (?branch_id, date, party_size)
GET    /api/v1/reservations                           list reservations (filters: branch_id, date, status)
POST   /api/v1/reservations                           create reservation
GET    /api/v1/reservations/{id}                      show reservation
PUT    /api/v1/reservations/{id}                      update reservation
POST   /api/v1/reservations/{id}/arrive               mark arrived
POST   /api/v1/reservations/{id}/seat                 seat guests (requires table_id)
POST   /api/v1/reservations/{id}/complete             complete (table → needs_cleaning)
POST   /api/v1/reservations/{id}/no-show              no-show (table freed, no_show_count++)
POST   /api/v1/reservations/{id}/cancel               cancel with optional reason
```

#### Waitlist
```
GET    /api/v1/branches/{branch}/waitlist              list waiting entries
POST   /api/v1/branches/{branch}/waitlist              add to waitlist
POST   /api/v1/branches/{branch}/waitlist/{id}/seat    seat from waitlist
POST   /api/v1/branches/{branch}/waitlist/{id}/leave   mark as left
```

#### Walk-in
```
POST   /api/v1/walk-in/match                           match by phone (action: match|create|multiple)
```

---

### 10. Customer Profiles & Loyalty ✓ (Phase 2 — Module 2)

**What it does:**
- Customer self-registration via phone + password (platform-level — shared across all restaurants)
- Staff enrollment of customers at a specific restaurant (creates `customer_tenant_profiles`)
- Phone deduplication (E.164 normalised): single match → link, no match → create, multiple → 409 (merge required)
- Loyalty points engine: earn on order completion (1 pt/$1, tier multiplier, birthday 2×), redeem at order creation (100 pts = $1, minimum 100, multiples of 100, capped at subtotal)
- Tier progression: Bronze (default) → Silver ($500 / 6 visits) → Gold ($1500 / 15 visits); immediate upgrades, weekly batch for downgrades
- Manual points adjustment (staff, requires `customers.adjust_points` permission)
- Immutable `loyalty_transactions` audit trail (ULID PKs)
- `IssueLoyaltyPointsJob` wired with real logic — dispatched on order `completed`
- Weekly tier recalculation job (`RecalculateLoyaltyTiersJob`) scheduled Monday 03:00 on `analytics` queue
- GDPR erasure: initiate (sets `deletion_pending`, stops comms) → process (anonymises PII, forfeits points, revokes tokens)
- Customer portal: view loyalty data, view transaction history, update profile, request own erasure

**Test:** `php artisan test --filter="ProfileDeduplicationTest|LoyaltyTransactionTest|GdprErasureTest|LoyaltyPointsServiceTest"`

#### Staff-facing customer endpoints (auth:staff + TenantMiddleware)
```
GET    /api/v1/customers                                list / search customers for this tenant
POST   /api/v1/customers/enroll                         enroll a customer (find or create platform profile + tenant profile)
GET    /api/v1/customers/{customer}                     view full customer profile
PATCH  /api/v1/customers/{customer}/notes               update staff notes
GET    /api/v1/customers/{customer}/loyalty/transactions view loyalty transaction history
POST   /api/v1/customers/{customer}/loyalty/adjust      manually adjust points
POST   /api/v1/customers/{customer}/erasure             initiate GDPR erasure
```

#### Customer portal endpoints (auth:customer)
```
POST   /api/v1/customer/auth/register       register new customer account
POST   /api/v1/customer/auth/login          login (returns platform-level token)
POST   /api/v1/customer/auth/logout         logout
GET    /api/v1/customer/auth/restaurants    list restaurants customer has visited
POST   /api/v1/customer/auth/select         select a restaurant (returns tenant-scoped token)
GET    /api/v1/customer/auth/me             view own platform profile

GET    /api/v1/customer/loyalty             view own loyalty data for selected restaurant
GET    /api/v1/customer/loyalty/transactions view own transaction history
PATCH  /api/v1/customer/profile             update own profile (prefs, DOB, allergens)
POST   /api/v1/customer/erasure             request own GDPR erasure

GET    /api/v1/customer/reservations        list own reservation history (?upcoming=1, ?status=)
GET    /api/v1/customer/reservations/{id}   view single reservation (404 if not yours)
GET    /api/v1/customer/bookings            list own event booking history (?upcoming=1)
GET    /api/v1/customer/bookings/{id}       view single event booking with space, package, run sheet
```

---

## How to Bootstrap a Working Environment

```bash
cd /Users/deepak/Projects/ChefLogik/api

# 1. Install dependencies
composer install

# 2. Set up .env (copy from .env.example and configure DB credentials)
cp .env.example .env

# 3. Run migrations and seed
php artisan migrate
php artisan db:seed    # seeds: 79 permissions, 8 system roles, 3 plans, 1 platform admin

# 4. Start the server
php artisan serve      # http://localhost:8000
```

## Default Credentials

| Account | Email | Password |
|---|---|---|
| Platform Admin | admin@cheflogik.com | changeme-in-production |

**No staff users are pre-seeded.** Create a tenant via the platform API — it auto-provisions the first owner, 8 system roles, and sends a welcome email with a temporary password.

## Quick Local Dev Setup

```bash
# Create a tenant + first owner via the platform API
curl -X POST http://localhost:8000/api/platform/tenants \
  -H "Authorization: Bearer <platform_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name":        "Test Restaurant",
    "slug":        "test-restaurant",
    "plan_id":     "<plan_uuid>",
    "owner_name":  "Test Owner",
    "owner_email": "owner@test.com"
  }'
# Response includes tenant_id, owner.id, and temp_password
```

Then login as the owner:
```bash
POST /api/v1/auth/staff/login
{ "email": "owner@test.com", "password": "<temp_password>", "tenant_id": "<tenant_uuid>" }
```

---

### 11. Inventory & Kitchen
**What it does:** Full stock management from supplier → PO → GRN receipt (with WAC recalculation) → recipe-driven deduction on order confirmation → waste logging → stocktake reconciliation → KDS ticket flow with allergen enforcement.

**47 new tests passing.** (`php artisan test --filter="InventoryItemTest|WacRecalculationTest|GrnTest|DeductStockTest|SupplierAndPoTest|WasteLogTest|StocktakeTest|KdsTicketTest"`)

#### Inventory Items
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/inventory/items` | `inventory.view_stock` | List items (filterable by branch, category, below_reorder, below_critical) |
| POST | `/api/v1/inventory/items` | `inventory.edit_items` | Create inventory item |
| GET | `/api/v1/inventory/items/{id}` | `inventory.view_stock` | Show single item |
| PATCH | `/api/v1/inventory/items/{id}` | `inventory.edit_items` | Update item settings |
| DELETE | `/api/v1/inventory/items/{id}` | `inventory.edit_items` | Delete item |
| POST | `/api/v1/inventory/items/{id}/adjust` | `inventory.edit_items` | Manual stock adjustment (+ or -) |
| GET | `/api/v1/inventory/items/{id}/movements` | `inventory.view_stock` | Stock movement history |

#### Recipes
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/inventory/recipes` | `inventory.edit_recipes` | List recipes |
| POST | `/api/v1/inventory/recipes` | `inventory.edit_recipes` | Create recipe (draft) |
| GET | `/api/v1/inventory/recipes/{id}` | `inventory.edit_recipes` | Show recipe with ingredients |
| PATCH | `/api/v1/inventory/recipes/{id}` | `inventory.edit_recipes` | Update recipe (not if approved) |
| POST | `/api/v1/inventory/recipes/{id}/submit` | `inventory.edit_recipes` | Submit for approval |
| POST | `/api/v1/inventory/recipes/{id}/approve` | `inventory.edit_recipes` | Approve (triggers WAC propagation) |
| POST | `/api/v1/inventory/recipes/{id}/archive` | `inventory.edit_recipes` | Archive recipe |

#### Suppliers & Purchase Orders
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/inventory/suppliers` | `inventory.create_po` | List suppliers |
| POST | `/api/v1/inventory/suppliers` | `inventory.create_po` | Create supplier |
| GET/PATCH/DELETE | `/api/v1/inventory/suppliers/{id}` | `inventory.create_po` | Show/update/deactivate supplier |
| GET | `/api/v1/inventory/purchase-orders` | `inventory.create_po` | List POs |
| POST | `/api/v1/inventory/purchase-orders` | `inventory.create_po` | Create PO (draft) |
| GET | `/api/v1/inventory/purchase-orders/{id}` | `inventory.create_po` | Show PO with items |
| POST | `/api/v1/inventory/purchase-orders/{id}/send` | `inventory.create_po` | Mark PO as sent |
| POST | `/api/v1/inventory/purchase-orders/{id}/cancel` | `inventory.create_po` | Cancel PO |

#### Goods Received Notes (GRN)
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/inventory/grns` | `inventory.receive_grn` | List GRNs |
| POST | `/api/v1/inventory/grns` | `inventory.receive_grn` | Create GRN (draft) |
| GET | `/api/v1/inventory/grns/{id}` | `inventory.receive_grn` | Show GRN |
| POST | `/api/v1/inventory/grns/{id}/receive` | `inventory.receive_grn` | Receive GRN — triggers WAC recalculation per line, records temp readings |

#### Waste Logs
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/inventory/waste-logs` | `inventory.log_waste` | List waste logs |
| POST | `/api/v1/inventory/waste-logs` | `inventory.log_waste` | Log waste event (deducts stock, snapshots WAC cost) |

#### Stocktakes
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/inventory/stocktakes` | `inventory.conduct_stocktake` | List stocktakes |
| POST | `/api/v1/inventory/stocktakes` | `inventory.conduct_stocktake` | Initiate stocktake (snapshots system quantities) |
| GET | `/api/v1/inventory/stocktakes/{id}` | `inventory.conduct_stocktake` | Show stocktake with counts |
| POST | `/api/v1/inventory/stocktakes/{id}/counts` | `inventory.conduct_stocktake` | Submit counted quantities |
| POST | `/api/v1/inventory/stocktakes/{id}/complete` | `inventory.conduct_stocktake` | Complete — applies variance corrections, calculates COGS variance |

#### KDS (Kitchen Display System)
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/kds/tickets` | `kds.view` | List active tickets (filterable by branch, station) |
| GET | `/api/v1/kds/tickets/{id}` | `kds.view` | Show ticket with items |
| POST | `/api/v1/kds/tickets/{id}/complete` | `kds.mark_prepared` | Complete ticket (pass manager) |
| POST | `/api/v1/kds/tickets/{id}/items/{itemId}/start` | `kds.mark_prepared` | Start item (in_progress) |
| POST | `/api/v1/kds/tickets/{id}/items/{itemId}/prepared` | `kds.mark_prepared` | Mark item prepared (BLOCKED if allergen unacknowledged) |
| POST | `/api/v1/kds/tickets/{id}/items/{itemId}/allergen-ack` | `kds.acknowledge_allergen` | Acknowledge allergen alert (immutable log) |

**Key behaviours:**
- KDS tickets auto-created on `OrderConfirmed` event (via `CreateKdsTicketsListener`)
- Allergen gate: `markPrepared` returns 422 if `has_allergen_alert = true` and no acknowledgement
- 30s SLA: `CheckAllergenSlaJob` dispatched on ticket creation; escalates unacknowledged alerts via WebSocket
- Auto-86: `DeductStockJob` runs on `OrderConfirmed` (critical queue); when stock hits zero → `InventoryStockDepleted` event → `AutoEightySixOnStockoutListener` 86s all affected menu items with `trigger_type = inventory_stockout`
- Inventory-stockout 86s cannot auto-restore — manager confirmation required (enforced in `EightySixService::restore()`)
- WAC recalculated on every GRN line item receipt; propagates to `menu_items.cost_price` for all approved recipes using the ingredient

---

### 12. Events & Functions
**What it does:** Full private events management from initial enquiry through proposal, confirmation, pre-event planning, day-of execution, and completion. Includes event spaces, packages, corporate accounts with credit checking, pre-event task management, run sheet generation, and deposit stub (Stripe pending).

**29 new tests passing.** (`php artisan test --filter="EventLifecycleTest|EventSpaceAndPackageTest|CorporateAccountTest|EventTasksAndRunSheetTest"`)

#### Event Spaces
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/events/spaces` | events.view | List spaces (optionally by branch) |
| POST | `/api/v1/events/spaces` | events.manage_packages | Create event space |
| GET | `/api/v1/events/spaces/{id}` | events.view | Get space |
| PATCH | `/api/v1/events/spaces/{id}` | events.manage_packages | Update space |
| DELETE | `/api/v1/events/spaces/{id}` | events.manage_packages | Delete space |

#### Event Packages
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/events/packages` | events.view | List packages |
| POST | `/api/v1/events/packages` | events.manage_packages | Create package |
| GET | `/api/v1/events/packages/{id}` | events.view | Get package |
| PATCH | `/api/v1/events/packages/{id}` | events.manage_packages | Update package |
| DELETE | `/api/v1/events/packages/{id}` | events.manage_packages | Delete package |

#### Corporate Accounts
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/events/corporate-accounts` | events.manage_corporate | List accounts |
| POST | `/api/v1/events/corporate-accounts` | events.manage_corporate | Create account |
| GET | `/api/v1/events/corporate-accounts/{id}` | events.manage_corporate | Get account |
| PATCH | `/api/v1/events/corporate-accounts/{id}` | events.manage_corporate | Update account |
| POST | `/api/v1/events/corporate-accounts/{id}/hold` | events.manage_corporate | Put on hold |
| POST | `/api/v1/events/corporate-accounts/{id}/reactivate` | events.manage_corporate | Reactivate |
| POST | `/api/v1/events/corporate-accounts/{id}/credit-check` | events.manage_corporate | Check credit limit |

#### Events (Enquiry Pipeline & Lifecycle)
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/events` | events.view | List events (filter by status, branch, date) |
| POST | `/api/v1/events` | events.manage | Create enquiry (status=enquiry) |
| GET | `/api/v1/events/{id}` | events.view | Get event with tasks and relationships |
| PATCH | `/api/v1/events/{id}` | events.manage | Update event details |
| POST | `/api/v1/events/{id}/send-proposal` | events.manage | enquiry → proposal |
| POST | `/api/v1/events/{id}/confirm` | events.manage | proposal → confirmed (+ task generation) |
| POST | `/api/v1/events/{id}/cancel` | events.manage | Cancel event (cancels future children too) |
| POST | `/api/v1/events/{id}/mark-lost` | events.manage | Mark enquiry/proposal as lost |
| POST | `/api/v1/events/{id}/pre-event` | events.manage | confirmed → pre_event |
| POST | `/api/v1/events/{id}/day-of` | events.manage | pre_event → day_of (builds run sheet) |
| POST | `/api/v1/events/{id}/complete` | events.manage | day_of → completed |
| POST | `/api/v1/events/{id}/payment` | events.manage | Deposit stub (⚠️ Decision 7 pending) |
| GET | `/api/v1/events/{id}/run-sheet` | events.view | Get run sheet JSONB |

#### Pre-Event Tasks
| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/events/{id}/tasks` | events.view | List tasks for event |
| POST | `/api/v1/events/{id}/tasks` | events.manage | Create task |
| PATCH | `/api/v1/events/{id}/tasks/{task_id}` | events.manage | Update (mark complete, reassign) |

**Key behaviours:**
- State machine enforced: enquiry → proposal → confirmed → pre_event → day_of → completed (+ cancelled at any active stage)
- `markLost` only valid on enquiry or proposal status; requires reason (price|date_unavailable|competitor|no_response|other)
- `confirm` auto-generates pre-event tasks from `TASK_TEMPLATES` based on `occasion_type` (birthday, corporate, wedding, anniversary)
- Recurring events: `generateRecurringChildren()` creates child event records per recurrence_rule JSONB; cancelling parent cancels all future non-completed children
- `moveToDayOf` builds a run sheet JSONB snapshot stored on `events.run_sheet`
- Corporate credit check: `outstandingBalance()` sums active unpaid events; returns `requires_owner_auth=true` if limit would be exceeded
- Deposit collection stubbed — returns `pi_stub_{event_id}` until Stripe (Decision 7) is confirmed

---

### 13. SaaS Tenant Onboarding
**What it does:** New restaurants sign up without manual platform-admin intervention. Owner creates an account, picks a plan, and sets up their first branch through a 2-step wizard.

**17 new tests passing.** (`php artisan test --filter="SelfServiceSignupTest|OnboardingWizardTest"`)

#### Public Endpoints (no auth required)
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/public/plans` | List active subscription plans with feature flags |
| POST | `/api/public/slug-check` | Check tenant slug availability (live form validation) |
| POST | `/api/public/signup` | Create tenant + 8 system roles + owner; returns Sanctum token |

#### Onboarding Wizard (auth:staff + TenantMiddleware)
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/onboarding/status` | Current wizard step, has_branch, first_branch_id |
| POST | `/api/v1/onboarding/branch` | Create first branch; advances step to complete |
| POST | `/api/v1/onboarding/complete` | Mark onboarding done (skip wizard) |

**Key behaviours:**
- Signup creates tenant with `settings.onboarding.step = 'branch_setup'` and `completed = false`
- Returns a Sanctum token immediately — owner is logged in after signup, no separate login step needed
- Token auto-stores `tenant_id` and `user_type = staff` so TenantMiddleware works on subsequent requests
- `POST /onboarding/branch` blocks a second call (422 if branch already exists — use `/api/v1/branches` for more)
- Onboarding state stored in `tenants.settings` JSONB — no new column needed
- `POST /api/public/signup` validates slug uniqueness and email uniqueness across all tenants (platform-wide)
- Password requires min 8 chars with at least one letter and one number

---

### 14. Analytics & Reporting ✓ (Phase 3 — Module 1)
**What it does:** Pre-aggregation jobs populate analytics tables from live transaction data. Five role-specific dashboards query only the pre-aggregated tables — never the live tables — for fast, consistent reads.

**17 new tests passing.** (`php artisan test --filter="DashboardTest"`)

#### Pre-Aggregation Jobs (run on `analytics` queue)

| Job | Schedule | Description |
|-----|----------|-------------|
| `AggregateDailyRevenueJob` | Nightly | Groups settled orders by channel per branch → `analytics_daily_revenue` |
| `AggregateHourlySnapshotJob` | Every hour | Revenue + order_count snapshot for current hour → `analytics_hourly_snapshots` |
| `RecalculateRfmSegmentsJob` | Weekly Mon 03:00 | Full RFM scoring + CLV + churn risk per customer → `analytics_customer_segments` |
| `CalculateDishPerformanceJob` | Weekly | Per-dish sales metrics + menu engineering quadrants → `analytics_dish_performance` |

All jobs use `upsert()` — safe to re-run without duplicating data.

#### Dashboards

| Method | URL | Permission | Description |
|--------|-----|-----------|-------------|
| GET | `/api/v1/analytics/owner-dashboard` | `analytics.owner_dashboard` | Cross-branch revenue, by_branch, by_channel, RFM segment counts, top customers, churn risk |
| GET | `/api/v1/analytics/branch-dashboard?branch_id=` | `analytics.branch_dashboard` | Single-branch revenue trend, top dishes, menu engineering quadrant breakdown |
| GET | `/api/v1/analytics/kitchen-dashboard?branch_id=` | `analytics.kitchen_dashboard` | Live KDS ticket stats, active tickets, unacknowledged allergen count, hourly snapshots |
| GET | `/api/v1/analytics/events-dashboard` | `analytics.events_dashboard` | Event stats by status, lead conversion rate, lost-reason breakdown, upcoming events |
| GET | `/api/v1/analytics/customer-dashboard` | `analytics.customer_dashboard` | RFM segment distribution, churn risk count, high-value-at-risk list, total projected CLV |

All dashboard endpoints accept optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` (default: last 30 days).

**Key behaviours:**
- **RFM scoring**: Recency (5 tiers by days since last visit), Frequency (5 tiers by total visits), Monetary (per-tenant spend quintile breakpoints)
- **8 RFM segments**: champion, loyal, potential_loyalist, at_risk, about_to_churn, new, lost, high_value_at_risk
- **Churn risk score**: 0.0–1.0; `min(1.0, (days_since / expected_interval - 1) / 2)` — 0 until overdue, 1.0 at 3× overdue
- **CLV projected**: avg_spend_per_visit × (52 / interval_weeks) × 3-year lifespan
- **Menu engineering**: category-level averages (not restaurant-wide) for popularity/margin quadrant classification (star/plowhorse/puzzle/dog)

---

## Backend Bug Fixes

### `User::roles()` relationship (applied during frontend Module 2)
`App\Models\User` was missing a `roles()` `BelongsToMany` relationship. The `StaffAuthController::login()` and `me()` endpoints both called `$user->roles()->first()` to return `role_slug`, which threw `BadMethodCallException`. Fixed by adding:
```php
public function roles(): BelongsToMany
{
    return $this->belongsToMany(Role::class, 'user_roles')
        ->withPivot(['branch_ids', 'assigned_at', 'assigned_by']);
}
```
The existing `userRoles()` `HasMany` is kept for pivot-data access; `roles()` is the new direct `Role` relationship.

---

## Frontend — `/web` (React 19 + TypeScript + MST)

### Module 1 — Foundation & Auth ✓

**Stack bootstrapped:**
- Vite 8 + React 19 + TypeScript strict mode
- TanStack Router v1 (file-based routing, auto code-splitting)
- Tailwind CSS v4 + shadcn/ui (Geist font, CSS variables theme)
- MobX + MobX-State-Tree for all server state
- Axios `ApiService` (`src/services/api.ts`) — injects `Authorization` + `X-Branch-Id` headers, handles 401 globally
- Vitest + React Testing Library — 15 tests passing

**Key files:**
| File | Purpose |
|---|---|
| `src/services/api.ts` | Typed Axios wrapper — base URL `/api/v1`, auth + branch headers, 401 callback |
| `src/stores/AuthStore.ts` | MST store — `login()`, `logout()`, `rehydrate()`, `setBranch()`, `can()` / `canAny()` / `canAll()` |
| `src/stores/root.ts` | Singleton `RootStore`, `createStore()` / `getStore()` |
| `src/stores/context.tsx` | `StoreProvider`, `useStore()`, `useAuth()` hooks |
| `src/components/shared/PermissionGate.tsx` | Renders children only if `authStore.can(permission)` |
| `src/components/auth/LoginPage.tsx` | Staff login — email + password + tenant_id |
| `src/components/layout/AppShell.tsx` | Top nav, permission-gated links, sign-out |
| `src/components/layout/BranchSwitcher.tsx` | Branch context switcher for multi-branch staff |
| `src/main.tsx` | Bootstraps store → rehydrates token → mounts TanStack Router |

**Routes:**
- `/` → redirects to `/dashboard` or `/login`
- `/login` → `LoginPage` (staff guard)
- `/_authenticated/*` → protected layout with `AppShell`
- `/_authenticated/dashboard` → placeholder

**Backend fix applied:** `StaffAuthController::login()` and `me()` now both return `tenant_id`, `tenant_name`, `role_slug`, `branch_ids`, `permissions` in the response (previously only returned `id`, `name`, `email`).

**How to run:**
```bash
cd /Users/deepak/Projects/ChefLogik/web
npm run dev        # Vite dev server
npm test           # Vitest (15 tests)
npm run build      # Production build
```

---

### Module 2 — Branch & Staff Management ✓

**New stores, services, pages, and components. 15 tests still passing, zero TypeScript errors.**

#### New files
| File | Purpose |
|---|---|
| `src/types/staff.ts` | `Branch`, `Staff`, `Role`, `Permission`, `RoleAssignment` types + all payload types |
| `src/services/BranchService.ts` | Typed API calls — list, get, create, update, delete |
| `src/services/StaffService.ts` | Typed API calls — list, get, create, update, offboard, listAssignments, assignRole, revokeRole |
| `src/services/RoleService.ts` | Typed API calls — list, get, create, update, delete, listPermissions |
| `src/stores/BranchStore.ts` | MST `BranchModel` + `BranchStore` — fetchAll, create, update, remove |
| `src/stores/StaffStore.ts` | MST `StaffModel` + `RoleModel` + `StaffStore` — full staff CRUD, role builder, permissions, per-staff role assignments |
| `src/components/ui/input.tsx` | Shared `Input` component with consistent Tailwind styling |
| `src/components/staff/PermissionPicker.tsx` | Grouped permission checkboxes with per-module select-all toggle |

#### Updated files
| File | Change |
|---|---|
| `src/stores/root.ts` | Added `branches` (`BranchStore`) and `staff` (`StaffStore`) to `RootStore` |
| `src/stores/context.tsx` | Added `useBranchStore()` and `useStaffStore()` hooks |
| `src/components/layout/AppShell.tsx` | Fixed all nav permission slugs to match backend (`staff.view_all`, `menu.view`, `inventory.view_stock`, `customers.view_basic`, `analytics.branch_dashboard`); added Branches nav link |

#### Routes
| Route | Permission gate | Description |
|---|---|---|
| `/branches` | `branches.view` | Branch list with status badges and delete |
| `/branches/new` | `branches.create` | Create branch form |
| `/branches/$branchId` | `branches.edit` | Edit branch form |
| `/staff` | `staff.view_all` | Staff list with avatar initials and status badges |
| `/staff/new` | `staff.manage` | Create staff form; redirects to detail for role assignment |
| `/staff/$staffId` | `staff.view_all` | Profile card, offboard form, role assignment/revocation panel |
| `/roles` | `roles.view` | Role list; system role badges; delete guard |
| `/roles/new` | `roles.create` | Create role with `PermissionPicker` |
| `/roles/$roleId` | `staff.manage_roles` | Edit role with `PermissionPicker`; read-only view for system roles |

#### Key behaviours
- `PermissionPicker` fetches permissions once (`fetchAllPermissions` is idempotent) and groups them by module — clicking a module header toggles all permissions in that group
- Role assignment UI on staff detail shows only roles the staff member does **not** already hold; revoke always warns that last-role guard will reject if it's their only role
- System roles show as read-only on the edit page (no form rendered)
- Staff create redirects directly to the detail page so the operator can immediately assign a role in the same flow
- All permission checks mirror the exact slugs enforced by the backend (`branches.view`, `branches.create`, `branches.edit`, `branches.delete`, `staff.view_all`, `staff.manage`, `roles.view`, `roles.create`, `roles.delete`, `roles.assign`)

---

### Module 4 — Orders Live Dashboard ✓

**New stores, services, WebSocket wiring, and four order pages. Zero TypeScript errors. Build passes cleanly.**

#### New files
| File | Purpose |
|---|---|
| `src/types/orders.ts` | `Order`, `OrderItem`, `OrderStatus`, `OrderSource`, `ACTIVE_STATUSES`, `NEXT_TRANSITIONS`, `CANCEL_REASON_CODES`, WebSocket payload types |
| `src/services/OrderService.ts` | Typed API calls — list (handles double-wrapped paginator response), get, create, transition, cancel |
| `src/websocket/echo.ts` | Laravel Echo initialisation with Reverb broadcaster; `initEcho()` / `disconnectEcho()` / `getEcho()` |
| `src/websocket/orderChannel.ts` | Subscribes to `tenant.{tenantId}.branch.{branchId}.orders`; listens to `OrderStatusChanged` + `NewOrderReceived`; returns unsubscribe fn |
| `src/stores/OrderStore.ts` | MST `OrderModel` + `OrderStore` — `orders: types.map(OrderModel)`, views: `activeOrders`, `activeForBranch`, `byStatus` (Kanban map), `historyOrders`, `getById`; actions: `fetchActive`, `fetchHistory`, `fetchOne`, `createOrder`, `transitionStatus`, `cancelOrder`, `subscribeToChannel`, `unsubscribeFromChannel` |

#### Updated files
| File | Change |
|---|---|
| `src/stores/AuthStore.ts` | Calls `initEcho(token)` in both `login()` and `rehydrate()`; `disconnectEcho()` in `logout()` |
| `src/stores/root.ts` | Added `orders: types.optional(OrderStore, {})` |
| `src/stores/context.tsx` | Added `useOrderStore()` hook |

#### Routes
| Route | Permission gate | Description |
|---|---|---|
| `/orders` | `orders.view` | Live Kanban board — 7 columns (new → confirmed → preparing → ready → out_for_delivery → served → bill_settled); 30s elapsed-timer refresh; WebSocket subscribed on mount |
| `/orders/new` | `orders.create` | Staff-entered order form — source, table, customer details, allergen note, line items with qty/price/special instructions |
| `/orders/history` | `orders.view` | Paginated history table — date range, status, source filters; links to order detail |
| `/orders/$orderId` | `orders.view` | Full order detail — items table with modifiers, totals breakdown, status badge, cancel form with reason code, status history timeline, transition buttons |

#### Key behaviours
- Kanban `byStatus` view pre-buckets all active orders per status for O(1) column renders
- `subscribeToChannel()` calls `getRoot<RootStoreType>()` to resolve `tenantId` + `currentBranchId` at subscribe time; auto-unsubscribes in route cleanup
- `fetchActive` only fetches last 24h; does not clear completed/cancelled already in the map
- Cancel dialog accepts a `reason_code` from `CANCEL_REASON_CODES` + optional free-text note
- Allergen note shown in red highlight on both Kanban cards and detail page
- Order detail fetches from API on first visit if not already in store cache
- Route declarations moved to end of each file (after component `const`) to satisfy TypeScript's TDZ rules for `const` declarations — pattern applied to all route files including pre-existing branches/staff/roles routes
- Echo generic typed as `Echo<'reverb'>` to satisfy `keyof Broadcaster` constraint in laravel-echo v1.x TypeScript types

---

### Module 3 — Menu Management ✓

**New store, service, WebSocket channel, and three menu pages. Zero TypeScript errors. Build and all 15 tests pass.**

#### New files
| File | Purpose |
|---|---|
| `src/types/menu.ts` | `MenuCategory`, `MenuItem`, `ModifierGroup`, `Modifier`, `MenuItemBranchOverride`, `EightySixLog`, all create/update payload types, `ItemAvailabilityChangedPayload` WebSocket type |
| `src/services/MenuService.ts` | Typed API calls — categories CRUD, items CRUD, modifier group attach/detach, branch overrides upsert/delete, 86/restore/history |
| `src/websocket/menuChannel.ts` | Subscribes to `tenant.{tenantId}.menu` channel; listens for `ItemAvailabilityChanged`; returns unsubscribe fn (ready when backend adds `ShouldBroadcast`) |
| `src/stores/MenuStore.ts` | MST `MenuCategoryModel` + `MenuItemModel` + `MenuStore` — categories/items maps, `activeLogs` keyed `{itemId}:{branchId}`, `overrides` keyed `{itemId}:{branchId}`, `latestAlert` for toast; full CRUD + 86 + WebSocket |

#### Updated files
| File | Change |
|---|---|
| `src/stores/root.ts` | Added `menu: types.optional(MenuStore, {})` |
| `src/stores/context.tsx` | Added `useMenuStore()` hook |
| `tsconfig.app.json` | Added `"vitest/globals"` to `types` array (fixes TS error in test files using `vi` global) |

#### Routes
| Route | Permission gate | Description |
|---|---|---|
| `/menu` | `menu.view` | Category sidebar + item list. Inline 86/restore toggle per branch. 5-second auto-dismiss toast for real-time 86 events. Branch warning when no branch selected. |
| `/menu/items/new` | `menu.manage` | Create item form — SKU, name, description, base/cost price, prep time, allergens (owner-only: `menu.edit_allergens`), dietary flags, active toggle |
| `/menu/items/$itemId` | `menu.view` | 4-tab detail: **Details** (edit form, allergens read-only for non-owners), **Modifier Groups** (attach/detach), **Branch Overrides** (per-branch price/availability/visibility), **86 Management** (branch-scoped 86/restore with stockout distinction + history log) |

#### Key behaviours
- 86 state keyed by `{itemId}:{branchId}` — each branch has independent 86 status per item
- `inventory_stockout` trigger type is visually distinguished and requires `manager_confirmed: true` to restore (browser confirm dialog explains this requirement)
- Allergen editing gated on `menu.edit_allergens` (owner-only per food safety rules) — non-owners see allergens as read-only
- WebSocket subscription wired to `tenant.{id}.menu` channel; `ItemAvailabilityChanged` payload updates `activeLogs` map and fires `latestAlert` toast
- `fetchEightySixHistory` is called on page load to seed active log state for the selected branch
- Modifier group attach/detach uses direct `MenuService` calls (not store action) since modifier group state lives on the item's `modifier_groups` field, refreshed via `fetchItem`

---

### Frontend Module 8 — Events & Functions ✓

**What it does:** Full enquiry-to-completion events pipeline including Kanban board, event detail with lifecycle actions, tasks checklist, run sheet, spaces/packages management, and corporate accounts.

**Files added:**
- `src/types/events.ts` — all type definitions (EventStatus, OccasionType, CorporateAccountStatus, Event, EventSpace, EventPackage, CorporateAccount, EventTask, RunSheet, pipeline stage config, label maps, payload types)
- `src/services/EventService.ts` — typed API service for all events endpoints
- `src/stores/EventStore.ts` — MST store with maps for events; frozen arrays for spaces/packages/corporate accounts; all flow actions
- `src/stores/root.ts` — `events: EventStore` added to RootStore
- `src/stores/context.tsx` — `useEventStore()` hook added

**Routes added:**
| Route | Permission | Description |
|-------|-----------|-------------|
| `/events` | `events.view` | Kanban pipeline board — 7 columns (enquiry → completed) with event cards, lifecycle transition buttons, mark-lost dialog |
| `/events/new` | `events.create` | New enquiry form — organiser details, occasion type, date, guest count, space/package/corporate account selectors |
| `/events/$eventId` | `events.view` | 3-tab detail page: **Details** (editable fields, financials, organiser info), **Tasks** (checklist with complete toggle + add task dialog), **Run Sheet** (timeline, menu summary, staff assignments) |
| `/events/spaces` | `events.manage` | Event spaces CRUD — inline create/edit forms with capacity, min spend, deposit config |
| `/events/packages` | `events.manage` | Event packages CRUD — inline create/edit with price per head, min guests, includes list |
| `/events/corporate-accounts` | `events.manage` | Corporate accounts CRUD with credit limit tracking, outstanding balance, hold/reactivate actions |

#### Key behaviours
- Kanban groups events by pipeline stage: `enquiry` (new/contacted), `proposal` (proposal_sent), `deposit` (deposit_paid), `confirmed`, `pre_event`, `day_of`, `completed`
- Lost/cancelled events shown in a separate collapsed panel below the Kanban
- Lifecycle transitions available inline on both Kanban card and event detail — contextual per current status
- Mark Lost requires a reason: `price | date_unavailable | competitor | no_response | other`
- Cancel dialog warns about non-refundable cancellation policy
- Tasks checklist supports add task (with title, description, due date) and toggle complete/incomplete
- Run Sheet lazy-loaded on demand via separate API call; only available from `pre_event` status onward
- Actual spend vs minimum spend comparison highlights shortfall in amber
- Corporate accounts show credit limit, outstanding balance, and calculated available credit
- All privileged actions gated on `events.manage` / `events.create` / `events.view` permission slugs

---

### Frontend Module 5 — Table & Reservation Management ✓

**What it does:** Real-time floor plan with colour-coded table status, full reservation lifecycle, walk-in waitlist management, and availability checking.

**Files added:**
- `src/types/reservations.ts` — TableStatus, ReservationStatus, WaitlistStatus, Table, FloorPlan, Reservation, WaitlistEntry, AvailabilitySlot, status label/color maps, payload types
- `src/services/ReservationService.ts` — TableService, FloorPlanService, ReservationService, WaitlistService (all API calls)
- `src/stores/TableStore.ts` — MST store for tables map + floor plans; WebSocket subscription to `tenant.{id}.branch.{id}.tables`
- `src/stores/ReservationStore.ts` — MST store for reservations map, waitlist, availability slots
- `src/websocket/tableChannel.ts` — Echo subscription for `TableStatusChanged`
- `src/stores/root.ts` — `tables: TableStore`, `reservations: ReservationStore` added to RootStore
- `src/stores/context.tsx` — `useTableStore()`, `useReservationStore()` hooks added

**Routes added:**
| Route | Permission | Description |
|-------|-----------|-------------|
| `/reservations` | `reservations.view` | List with date + status filters |
| `/reservations/new` | `reservations.create` | Form with availability check → table selector |
| `/reservations/$reservationId` | `reservations.view` | Detail page with lifecycle actions (arrive, seat, complete, no-show, cancel) |
| `/reservations/floor-plan` | `tables.view` | Colour-coded grid, click-to-act dialog, add-table form, live WebSocket updates |
| `/reservations/waitlist` | `reservations.manage` | Waitlist queue, add walk-in, seat-from-waitlist, mark-left |

#### Key behaviours
- Floor plan uses a responsive CSS grid; each table cell is colour-coded by status (free=green, reserved=blue, occupied=red, needs_cleaning=amber, blocked=gray)
- Table actions are context-sensitive per current status (e.g. only "Mark Needs Cleaning" when occupied, only "Mark Clean" when needs_cleaning)
- Block/unblock gated on `reservations.block_tables` permission
- Seat from reservation shows only free/reserved tables with capacity ≥ party size
- Availability check hits `/reservations/availability` with branch_id + date + party_size; results rendered as a selectable table grid
- WebSocket (`TableStatusChanged`) updates TableStore in real time; floor plan re-renders immediately
- Waitlist seated/left entries shown in a historical panel below the active queue
