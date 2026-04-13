# ChefLogik — What's Completed & How to Test

## Current Test State
**81 tests, 81 passing** (run from `/api` directory)
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

Dynamic role system. 79 permissions across all modules. 8 system roles seeded.

**System roles:** `owner`, `branch_manager`, `events_manager`, `head_chef`, `chef_de_partie`, `waiter`, `host`, `kitchen_porter`

All permission checks use `Gate::check('permission.slug')` — never role-name strings.
Permission list is cached in Redis (`perms:{tenant_id}:{user_id}`, 5-min TTL).

```
GET    /api/v1/staff/permissions              list all permissions (grouped)
GET    /api/v1/staff/roles                    list roles for tenant
POST   /api/v1/staff/roles                    create custom role
GET    /api/v1/staff/roles/{role}             show role + permissions
PUT    /api/v1/staff/roles/{role}             update role
DELETE /api/v1/staff/roles/{role}             delete role (non-system only)
```

**Test:** `php artisan test --filter RoleBuilderTest`

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

```
GET    /api/platform/tenants                  list all tenants
POST   /api/platform/tenants                  create tenant
GET    /api/platform/tenants/{tenant}         show tenant
PUT    /api/platform/tenants/{tenant}         update tenant
DELETE /api/platform/tenants/{tenant}         delete tenant
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

**No staff users are pre-seeded.** A platform admin must create a tenant, then you create the first staff owner via the staff API (or directly in the DB for local dev).

## Quick Local Dev Setup (Tinker)

```bash
php artisan tinker

# Create a tenant
$plan = App\Models\SubscriptionPlan::where('slug','starter')->first();
$tenant = App\Models\Tenant::create(['name'=>'Test Restaurant','slug'=>'test-restaurant','plan_id'=>$plan->id,'status'=>'active']);

# Create an owner role for the tenant
$role = App\Models\Role::create(['tenant_id'=>$tenant->id,'name'=>'Owner','slug'=>'owner','is_system'=>true]);
$role->permissions()->attach(App\Models\Permission::pluck('id'));

# Create a staff user
$user = App\Models\User::create(['tenant_id'=>$tenant->id,'name'=>'Test Owner','email'=>'owner@test.com','password'=>bcrypt('password'),'status'=>'active']);
App\Models\UserRole::create(['user_id'=>$user->id,'role_id'=>$role->id,'tenant_id'=>$tenant->id,'branch_ids'=>null,'assigned_by'=>$user->id,'assigned_at'=>now()]);

echo $tenant->id;  # copy this for login
```

Then login:
```bash
POST /api/v1/auth/staff/login
{ "email": "owner@test.com", "password": "password", "tenant_id": "<tenant_uuid>" }
```

---

### 6. Orders & Deliveries

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

**Test:**
```bash
php artisan test --filter="OrderLifecycleTest|DeliveryZoneTest"
```

**Key endpoints:**

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

**Create order example:**
```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "branch_id": "<branch_uuid>",
    "source": "dine_in_pos",
    "service_charge": 2.50,
    "items": [
      {
        "menu_item_id": "<item_uuid>",
        "item_name": "Classic Burger",
        "item_sku": "BURGER-01",
        "quantity": 2,
        "unit_price": 12.50
      }
    ]
  }'
```

**Transition status:**
```bash
curl -X POST http://localhost:8000/api/v1/orders/<id>/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

**Cancel order:**
```bash
curl -X POST http://localhost:8000/api/v1/orders/<id>/cancel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason_code": "out_of_stock", "reason_note": "Item unavailable"}'
```

**Valid order sources:** `dine_in_pos`, `takeaway_counter`, `qr_self_order`, `delivery_uber_eats`, `delivery_doordash`, `delivery_direct`, `phone`

**Valid status transitions:**
```
new → confirmed | cancelled
confirmed → preparing | cancelled
preparing → ready | cancelled
ready → served | cancelled
served → bill_settled
bill_settled → completed | cancelled
```

**Broadcast setup (for real-time dashboard):**
Set in `.env`:
```
REVERB_APP_KEY=your-key
REVERB_APP_SECRET=your-secret
REVERB_APP_ID=your-app-id
REVERB_HOST=localhost
REVERB_PORT=8080
```
Start WebSocket server: `php artisan reverb:start`
Subscribe to private channel: `tenant.{tenantId}.branch.{branchId}.orders`
