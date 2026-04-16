# Staff Module — Implementation Reference

> Covers the actual implementation decisions, data flows, and conventions used across the
> Staff module backend (Laravel) and frontend (React / MST). For business requirements see
> `docs/modules/staff.md`. For the permission system see `docs/05-auth-roles.md`.

---

## Table of Contents

1. [Routes & Endpoints](#1-routes--endpoints)
2. [Backend Architecture](#2-backend-architecture)
3. [Frontend Routes & Components](#3-frontend-routes--components)
4. [MST Store Design](#4-mst-store-design)
5. [Key Implementation Decisions](#5-key-implementation-decisions)
6. [Permission Gates (Frontend + Backend)](#6-permission-gates-frontend--backend)
7. [Owner-Role Protection Rules](#7-owner-role-protection-rules)
8. [Filter System](#8-filter-system)
9. [Status Lifecycle](#9-status-lifecycle)
10. [Known Gotchas](#10-known-gotchas)

---

## 1. Routes & Endpoints

### Backend API (`/api/v1/staff`)

| Method | Path | Controller method | Permission | Notes |
|---|---|---|---|---|
| `GET` | `/staff` | `index` | `staff.view_all` | Supports `search`, `status`, `role_id`, `branch_id` query params |
| `POST` | `/staff` | `store` | `staff.create` / `staff.manage` | Atomic: creates user + assigns role in one transaction |
| `GET` | `/staff/{user}` | `show` | `staff.view_all` | |
| `PATCH` | `/staff/{user}` | `update` | `staff.edit` / `staff.manage` | Accepts `name`, `email`, `phone`, `employment`, `status` (`active`\|`inactive`) |
| `DELETE` | `/staff/{user}` | `destroy` | `staff.delete` | Hard delete |
| `POST` | `/staff/{user}/offboard` | `offboard` | `staff.offboard` / `staff.manage` | Sets status to `offboarded`, revokes tokens, writes audit log |
| `GET` | `/staff/{user}/roles` | `StaffRoleController@index` | `roles.view` | |
| `POST` | `/staff/{user}/roles` | `StaffRoleController@assign` | `roles.assign` | |
| `DELETE` | `/staff/{user}/roles/{role}` | `StaffRoleController@revoke` | `roles.assign` | Last-owner guard enforced here |

**Route registration note:** `Route::apiResource` auto-names the wildcard `{staff}` (singular of resource name). The controller type-hints `User $user`. To align these for implicit model binding the resource is registered as:
```php
Route::apiResource('staff', StaffController::class)->parameters(['staff' => 'user']);
```
Without this, all `show` / `update` / `destroy` calls return 404 because the parameter name never matches the variable name.

### Frontend Pages

| URL | File | Purpose |
|---|---|---|
| `/staff` | `staff/index.tsx` | List with search + role + status filters |
| `/staff/new` | `staff/new.tsx` | Create form (name, email, password, phone, role, employment) |
| `/staff/:staffId` | `staff/$staffId.tsx` | Profile view, role assignment/revocation, offboard |
| `/staff/:staffId/edit` | `staff/$staffId_.edit.tsx` | Edit form (name, email, phone, employment) |

**TanStack Router naming note:** The edit page uses `$staffId_.edit.tsx`. The trailing `_` on `$staffId_` tells TanStack Router this page is **not** a nested child of `$staffId.tsx`'s layout — it renders as a standalone page at the same URL depth. The `createFileRoute` path string keeps the underscore (`'/_authenticated/staff/$staffId_/edit'`); TanStack Router resolves it to the URL `/staff/:staffId/edit` at runtime.

---

## 2. Backend Architecture

### StaffController

Thin controller — all business logic is in `StaffService` or `RoleService`. The controller:
- Checks tenant isolation via `abort_if($user->tenant_id !== $request->get('resolved_tenant_id'), 404)`
- Authorises via `FormRequest::authorize()` (store/update) or explicit `$this->authorize()` (show/destroy)
- Returns `StaffResource` (includes `roles` array when `userRoles.role` is loaded)

### StaffService

```
list(branchId, search, status, roleId)
  → User::with('userRoles.role')->orderBy('name') + conditional where clauses

create(data, roleId, branchIds, actor)
  → DB::transaction {
      User::create(data)           // tenant_id auto-set by HasTenantScope
      RoleService::assignRole(...)  // includes privilege-escalation check
      return $staff->fresh(['userRoles.role'])
    }

update(staff, data)
  → $staff->update($data)
  → fresh(['userRoles.role'])

offboard(staff, data, actor)
  → DB::transaction {
      update status = 'offboarded', merge employment JSON
      $staff->tokens()->delete()   // force logout
      AuthService::invalidatePermissionCache(tenant_id, user_id)
      DB::table('audit_log')->insert(...)
    }

deleteStaff(id)
  → User::delete()   // hard delete
```

### StaffResource

Includes `roles` as a mapped array **only when** `userRoles` relationship is eager-loaded (`whenLoaded`). Each role entry carries:
```json
{
  "role_id": "...",
  "role_name": "Branch Manager",
  "role_slug": "branch_manager",
  "branch_ids": ["..."],
  "assigned_at": "2025-01-01T00:00:00Z"
}
```
`role_slug` is required by the frontend to compute `isOwner` on the model.

### StoreStaffRequest rules

```php
'name'                   required string
'email'                  required email unique:users,email
'password'               required min:8
'phone'                  sometimes nullable string
'role_id'                required uuid exists:roles,id   // ← required; assigned atomically
'branch_ids'             sometimes nullable array
'employment'             sometimes array
'employment.type'        required_with:employment  in:full_time,part_time,casual,contractor
'employment.start_date'  required_with:employment  date_format:Y-m-d
'employment.hourly_rate' sometimes nullable numeric
'employment.salary'      sometimes nullable numeric
```

### UpdateStaffRequest rules

```php
'name'                   sometimes string
'email'                  sometimes email unique:users,email,{userId}
'phone'                  sometimes nullable string
'employment'             sometimes array   (full replacement of JSONB)
'status'                 sometimes in:active,inactive   // suspended/offboarded via dedicated endpoints
```

`status` intentionally limited to `active`/`inactive`. `suspended` and `offboarded` transitions go through dedicated endpoints (`/offboard`) or are set by system processes.

### index() filter support

All four params are optional. `status` is validated inline — any value that is not `active` or `inactive` is treated as "no filter":
```php
status: in_array($request->query('status'), ['active', 'inactive'], true)
            ? $request->query('status')
            : null,
```
Search uses `lower()` + `like` (not `ILIKE`) for portability:
```php
$query->whereRaw('lower(name) like ?', ['%' . mb_strtolower($search) . '%'])
      ->orWhereRaw('lower(email) like ?', ['%' . mb_strtolower($search) . '%'])
```

---

## 3. Frontend Routes & Components

### Staff List (`/staff`)

State managed entirely within the component:

| State | Type | Purpose |
|---|---|---|
| `search` | `string` | Debounce-free text filter on name/email |
| `statusFilter` | `'all' \| 'active' \| 'inactive'` | Segmented control |
| `roleFilter` | `string` (role UUID or `''`) | Role dropdown |
| `processing` | `Set<string>` | Tracks in-flight Set Inactive / Delete per-row |

`visibleStaff` is derived inline (not in the store) by filtering `staffStore.staffList`:
1. Owner-visibility gate (non-owners cannot see Owner-role staff)
2. Status match
3. Role match via `member.roles?.some(r => r.role_id === roleFilter)`
4. Search match on `name` or `email` (case-insensitive)

**Why client-side?** The full staff list is fetched on mount. Filtering locally gives instant feedback with no loading states, and is appropriate at the scale of a single tenant (dozens to low-hundreds of staff).

Role dropdown options are populated from `staffStore.roleList` (fetched on mount alongside staff). The Owner role is hidden from the dropdown for non-owner users.

**Action column icons (lucide-react):**

| Icon | Condition | Action |
|---|---|---|
| `Eye` | always | Navigate to profile |
| `Pencil` | `staff.edit` / `staff.manage` | Navigate to edit form |
| `UserX` (yellow) | can edit + status `active` | PATCH status → `inactive` |
| `UserCheck` (green) | can edit + status `inactive` | PATCH status → `active` |
| `Trash2` (red) | `staff.delete` + status **not** `active` | DELETE with confirm |

Delete is intentionally blocked on active staff as a safety guard — staff must be deactivated or offboarded before deletion.

### Staff Create (`/staff/new`)

`role_id` is **required** in the form (no default). On submit, a single `POST /staff` call creates the user and assigns the role atomically via `DB::transaction` on the backend. The old two-step pattern (create then `POST /staff/{id}/roles`) was removed to eliminate partial-success states.

### Staff Profile (`/staff/:staffId`)

Fetches the member and their role assignments on mount. Sections:
- **Profile card** — name, email, status badge, phone, employment details
- **Offboard form** — shown only when `staff.manage` + status is `active`; reason field required
- **Roles section** — lists current assignments with Revoke buttons; role assign dropdown for `roles.assign`

### Staff Edit (`/staff/:staffId/edit`)

Pre-fills from `staffStore.getStaffById(staffId)`. If not cached, fetches via `fetchStaff()`. On success, navigates back to the profile page.
Fields: name, email, phone, employment (type, start date, hourly rate, salary). Password and role changes are separate flows.

---

## 4. MST Store Design

### StaffModel

```typescript
StaffModel {
  id:            identifier
  name:          string
  email:         string
  phone:         string | null
  status:        string          // 'active' | 'inactive' | 'suspended' | 'offboarded'
  employment:    frozen<Record<string, unknown>> | null
  profile_photo: string | null
  roles:         frozen<StaffRoleSummary[]> | null   // included when userRoles loaded
  created_at:    string
  updated_at:    string

  // Computed view
  isOwner → roles?.some(r => r.role_slug === 'owner') ?? false
}
```

`roles` uses `types.frozen<T>()` because it is a nested array from the API response — MST cannot deeply observe it, so `frozen` is the correct type.

### StaffStore views

| View | Returns | Used by |
|---|---|---|
| `staffList` | `StaffModelType[]` | List page, owner count |
| `roleList` | `RoleModelType[]` | Dropdowns throughout |
| `ownerCount` | `number` | Last-owner guard on detail page |
| `getStaffById(id)` | `StaffModelType \| undefined` | Detail + edit pages |
| `getAssignmentsFor(staffId)` | `RoleAssignment[]` | Role section on detail page |

### StaffStore actions

| Action | API call | Notes |
|---|---|---|
| `fetchAllStaff()` | `GET /staff` | Replaces entire `staff` map |
| `fetchStaff(id)` | `GET /staff/:id` | Upserts single entry |
| `createStaff(payload)` | `POST /staff` | Includes `role_id` |
| `updateStaff(id, payload)` | `PATCH /staff/:id` | Used for edit form + Set Inactive/Active |
| `deleteStaff(id)` | `DELETE /staff/:id` | Removes from map on success |
| `offboardStaff(id, reason)` | `POST /staff/:id/offboard` | Updates member in map |
| `fetchAllRoles()` | `GET /staff/roles` | Populates `roles` map |
| `fetchAssignments(staffId)` | `GET /staff/:id/roles` | Stores in `staffAssignments` map |
| `assignRole(staffId, payload)` | `POST /staff/:id/roles` | Re-fetches assignments after |
| `revokeRole(staffId, roleId)` | `DELETE /staff/:id/roles/:roleId` | Re-fetches assignments after |

---

## 5. Key Implementation Decisions

### D1 — Atomic staff creation with role assignment

**Decision:** `role_id` is a required field on `POST /staff`. The backend wraps `User::create()` + `RoleService::assignRole()` in a `DB::transaction`. If role assignment fails (e.g., privilege escalation), the user record is rolled back.

**Why:** The original two-step flow (create user → separately assign role) could leave a user with no role if step 2 failed. A roleless staff member cannot log in and is invisible to the UI — a silent partial-success state.

### D2 — Route parameter alignment

**Decision:** `Route::apiResource('staff', StaffController::class)->parameters(['staff' => 'user'])`.

**Why:** Laravel's `apiResource` names the wildcard from the resource name (`{staff}`), but implicit model binding matches by the controller variable name (`$user`). Without `.parameters(...)`, all `show` / `update` / `destroy` calls return 404 because the model is never bound. The manually registered sub-routes (`/offboard`, `/roles`) already used `{user}`, so they worked; only the apiResource routes were broken.

### D3 — Client-side filtering

**Decision:** Filter bar (search, role, status) operates on the already-loaded `staffStore.staffList` in the component. The backend `index()` also accepts the same params for API consumers.

**Why:** For a single tenant's staff list (typically < 200 members), loading all data once and filtering in memory gives instant UX without loading spinners. The backend filter support is provided for future use (pagination, external API consumers, deeper branch-level filtering).

### D4 — Delete blocked on active staff

**Decision:** The `Trash2` delete icon is only rendered when `member.status !== 'active'`.

**Why:** Prevents accidental deletion of currently-working staff. The workflow is: Set Inactive (or Offboard) → then Delete. The backend enforces no such guard (the permission check is sufficient there), but the UI provides a soft guard.

### D5 — `status` field scoped to `active`/`inactive` in update

**Decision:** `UpdateStaffRequest` allows `status` in `['active', 'inactive']` only. `suspended` and `offboarded` are not settable via `PATCH /staff/{id}`.

**Why:** `offboarded` requires a formal offboarding flow (reason, token revocation, audit log). `suspended` is reserved for system/platform-level actions. Restricting update ensures these states are only reached via the correct dedicated endpoints.

### D6 — Employment stored as JSONB

**Decision:** `users.employment` is a JSONB column, not a separate table. Fields: `type`, `start_date`, `hourly_rate`, `salary`, `offboarded_at`, `offboard_reason`, `last_working_day`, `notes`.

**Why:** Employment details are always fetched with the user record and never queried independently. A separate table would add joins with no benefit at this scale. Offboarding metadata is merged into the same JSONB blob on offboard.

---

## 6. Permission Gates (Frontend + Backend)

### Backend checks per operation

| Operation | Check |
|---|---|
| List staff | `staff.view_all` |
| Create staff | `FormRequest::authorize()` → `staff.create` or `staff.manage` |
| Update staff | `FormRequest::authorize()` → `staff.edit` or `staff.manage` |
| Delete staff | `$this->authorize('staff.delete')` |
| Offboard staff | `FormRequest::authorize()` → `staff.offboard` or `staff.manage` |
| Assign / Revoke role | `roles.assign` (+ escalation check in `RoleService`) |

### Frontend `auth.can()` checks

```
auth.can('staff.manage') || auth.can('staff.create')  → show "Add Staff" button
auth.can('staff.edit')   || auth.can('staff.manage')  → show Pencil + UserX/UserCheck icons
auth.can('staff.delete')                              → show Trash2 icon
auth.can('staff.manage') && member.status === 'active' → show Offboard button (detail page)
auth.can('roles.assign')                              → show Revoke buttons + assign dropdown
auth.can('roles.view')                                → show "Roles" nav button
```

All frontend checks are **UX-only**. The API always re-validates.

---

## 7. Owner-Role Protection Rules

Three layered rules protect the `owner` role from misuse:

### Rule 1 — Owners hidden from non-owner staff

**Where:** `StaffModel.isOwner` view + `visibleStaff` filter in list; permission wall in `$staffId.tsx`.

Non-owners never see Owner-role staff in the list. If a non-owner navigates directly to `/staff/:id` of an Owner member, they see a "no permission" message.

### Rule 2 — Owner role hidden from non-owner dropdowns

**Where:** Role dropdown in Create form, Role dropdown in detail-page assign section.

```typescript
.filter(role => auth.isOwner || role.slug !== 'owner')
```

Non-owners cannot assign the Owner role to anyone.

### Rule 3 — Last-owner guard

**Where:** Backend `RoleService::revokeRole()` + frontend disabled Revoke button with tooltip.

`isLastOwner = member.isOwner && staffStore.ownerCount <= 1`

If a tenant has only one Owner, the Owner role on that member cannot be revoked. The backend throws a `ValidationException` (422) to enforce this; the frontend shows a greyed-out Revoke label with a tooltip: "Cannot revoke the last owner".

`ownerCount` is computed from `staffStore.staffList` (members whose `roles` array contains a slug of `owner`).

---

## 8. Filter System

### Backend (`StaffService::list`)

```
GET /api/v1/staff?search=jane&status=active&role_id=<uuid>&branch_id=<uuid>
```

| Param | SQL | Notes |
|---|---|---|
| `search` | `lower(name) like '%q%' OR lower(email) like '%q%'` | Case-insensitive; `mb_strtolower` on PHP side |
| `status` | `WHERE status = ?` | Validated to `active`/`inactive` in controller |
| `role_id` | `whereHas('userRoles', fn => where('role_id', ?))` | Matches any role assignment on the user |
| `branch_id` | `whereHas('userRoles', fn => null branch_ids OR JSON contains)` | Original param, unchanged |

### Frontend (client-side)

Filter state lives in the list component. Computed derivation runs on every render (no `useMemo` — list is small enough):

```
visibleStaff = staffStore.staffList
  .filter(owner visibility gate)
  .filter(status)
  .filter(role — roles.some(r => r.role_id === roleFilter))
  .filter(search — name or email contains)
```

Role dropdown options come from `staffStore.roleList` (fetched on mount alongside staff). Non-owners see all roles except `owner`.

Status segmented control (All / Active / Inactive) updates `statusFilter`; the active tab gets `bg-primary text-white`.

Empty state distinguishes two cases:
- Zero staff in store → "No staff members yet" with CTA
- Staff exist but none match filters → "No staff match the current filters"

---

## 9. Status Lifecycle

```
           ┌─────────────────────────┐
           │          active         │◄──── PATCH /staff/{id} {status: 'active'}
           └────────┬────────────────┘
                    │ PATCH /staff/{id} {status: 'inactive'}
                    ▼
           ┌─────────────────────────┐
           │         inactive        │
           └────────┬────────────────┘
                    │ POST /staff/{id}/offboard  (or system)
                    ▼
           ┌─────────────────────────┐
           │        offboarded       │  (terminal — not reversible via API)
           └─────────────────────────┘

           suspended  ──  set by system/platform processes only
```

`active` ↔ `inactive` is the only reversible transition via `PATCH /staff/{id}`.
`offboarded` revokes all Sanctum tokens and writes to `audit_log` — it is not reversible via the API.
`suspended` is not settable via `UpdateStaffRequest`; reserved for future platform-level enforcement.

---

## 10. Known Gotchas

| Issue | Detail |
|---|---|
| `fetchStaff` errors are silently swallowed | In `$staffId.tsx`, the `void staffStore.fetchStaff()` call in `useEffect` discards the promise. If the API call fails, the page falls back to cached data from `fetchAllStaff()`. This is intentional — the list page pre-loads data so the detail page is usually pre-populated. |
| `StaffResource` only includes `roles` when eager-loaded | The resource uses `$this->whenLoaded('userRoles', ...)`. Routes that call `$user->load('userRoles.role')` or `$staff->fresh(['userRoles.role'])` return roles; routes that don't (e.g. a future partial update that skips `fresh()`) will return `"roles": null`. |
| `ownerCount` depends on loaded staff list | The last-owner guard on the detail page reads `staffStore.ownerCount`, which counts across the currently loaded staff list. If `fetchAllStaff` has not been called, the count may be 0 and the guard will incorrectly block revocation. The detail page calls `fetchAllStaff()` in its `useEffect` to ensure the count is available. |
| Employment is a full JSONB replacement on update | `UpdateStaffRequest` accepts `employment` as a whole object. The service calls `$staff->update($data)` which replaces the entire JSONB column. Partial employment updates (e.g. changing only hourly rate) must send the full employment object. The edit form pre-fills all known employment fields to prevent data loss. |
