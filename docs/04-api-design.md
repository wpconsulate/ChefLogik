# API Design

## Base URLs

```
/api/v1/          ← Tenant-scoped API (staff and customer endpoints)
/api/platform/    ← Platform-admin API (SaaS operator only)
/api/v1/customer/ ← Customer portal endpoints (separate auth guard)
```

## Tenant Resolution

Every request to `/api/v1/` must carry a valid Sanctum token. The `TenantMiddleware` resolves `tenant_id` from the token and sets it on the request object. All downstream queries automatically apply the tenant Global Scope.

```
Request → TenantMiddleware (sets request->tenantId) → PermissionMiddleware → Controller
```

The `tenant_id` is NEVER accepted from the request body or URL parameters — it always comes from the JWT. If a client sends a `tenant_id` in the body, it is ignored.

## Authentication Headers

```http
Authorization: Bearer {sanctum_token}
X-Branch-Id: {branch_uuid}    ← Required for branch-scoped endpoints
Accept: application/json
Content-Type: application/json
```

## Versioning

- All endpoints are versioned at `/api/v1/`
- Breaking changes introduce `/api/v2/` (both maintained during deprecation window)
- Non-breaking additions are added to the existing version

## REST Conventions

```
GET    /api/v1/orders              → index (paginated list)
POST   /api/v1/orders              → store (create)
GET    /api/v1/orders/{id}         → show (single resource)
PUT    /api/v1/orders/{id}         → update (full replace — rarely used)
PATCH  /api/v1/orders/{id}         → update (partial — common)
DELETE /api/v1/orders/{id}         → destroy

Nested resources (use sparingly, max 1 level deep):
GET    /api/v1/orders/{id}/items   → order line items
POST   /api/v1/orders/{id}/cancel  → action endpoints use verbs

Action endpoints (when REST verbs don't fit):
POST   /api/v1/orders/{id}/confirm
POST   /api/v1/orders/{id}/cancel
POST   /api/v1/tables/{id}/seat
POST   /api/v1/tables/{id}/clear
POST   /api/v1/menu-items/{id}/eighty-six
POST   /api/v1/menu-items/{id}/restore
```

## Pagination

```json
GET /api/v1/orders?page=2&per_page=25&branch_id={uuid}&status=confirmed

{
  "data": [ ... ],
  "meta": {
    "current_page": 2,
    "per_page": 25,
    "total": 142,
    "last_page": 6,
    "from": 26,
    "to": 50
  },
  "links": {
    "first": "/api/v1/orders?page=1",
    "prev": "/api/v1/orders?page=1",
    "next": "/api/v1/orders?page=3",
    "last": "/api/v1/orders?page=6"
  }
}
```

## Filtering and Sorting

```
GET /api/v1/orders?branch_id={uuid}&status=confirmed&source=uber_eats
GET /api/v1/orders?created_after=2026-01-01&created_before=2026-01-31
GET /api/v1/orders?sort=created_at&direction=desc
GET /api/v1/menu-items?category_id={uuid}&is_active=true
```

All filter parameters are validated in Form Request classes. Unknown filter params return 422.

## Error Response Schema

```json
// 400 Bad Request
{ "error": { "code": "INVALID_REQUEST", "message": "...", "details": {} } }

// 401 Unauthorized
{ "error": { "code": "UNAUTHENTICATED", "message": "Authentication required." } }

// 403 Forbidden
{ "error": { "code": "INSUFFICIENT_PERMISSIONS", "message": "You do not have permission to orders.cancel.", "required_permission": "orders.cancel" } }

// 404 Not Found
{ "error": { "code": "ORDER_NOT_FOUND", "message": "The requested order does not exist." } }

// 409 Conflict (state transition errors)
{ "error": { "code": "INVALID_STATUS_TRANSITION", "message": "Order cannot move from 'completed' to 'confirmed'.", "current_status": "completed", "attempted_status": "confirmed" } }

// 422 Validation Failed
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The given data was invalid.",
    "details": {
      "table_id": ["The selected table is not available."],
      "party_size": ["Party size exceeds table capacity."]
    }
  }
}

// 429 Rate Limited
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests. Retry after 60 seconds.", "retry_after": 60 } }

// 500 Internal Server Error
{ "error": { "code": "SERVER_ERROR", "message": "An unexpected error occurred. Reference: {error_id}" } }
```

## Rate Limiting

Per-tenant rate limits (not per-user):
- Standard tenant endpoints: 1000 requests / minute
- Webhook endpoints: 500 requests / minute (Stripe, Uber Eats, DoorDash)
- Export endpoints: 10 requests / minute
- Analytics endpoints: 60 requests / minute

Limits enforced via Laravel's `ThrottleRequests` middleware with Redis driver. Limit key: `tenant:{tenant_id}:{route_group}`.

## Webhook Endpoints

```
POST /api/webhooks/stripe              ← Stripe events
POST /api/webhooks/uber-eats           ← Uber Eats order events
POST /api/webhooks/doordash            ← DoorDash order events
POST /api/webhooks/twilio              ← Twilio delivery receipts
```

Webhook endpoints are:
- Outside the `TenantMiddleware` — tenant resolved from payload content
- Require signature verification BEFORE any business logic
- Must return 200 within 5 seconds (business logic dispatched to queue)
- Use Redis to store processed event IDs for idempotency (TTL 72h)

## Key Endpoint Groups

### Auth (`/api/v1/auth/`)
```
POST   /api/v1/auth/login                    → staff login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me                       → current user + permissions array

POST   /api/v1/auth/customer/login           → customer portal login
POST   /api/v1/auth/customer/register
```

### Orders (`/api/v1/orders/`)
```
GET    /api/v1/orders                        → list (branch-scoped)
POST   /api/v1/orders                        → create
GET    /api/v1/orders/{id}
PATCH  /api/v1/orders/{id}
POST   /api/v1/orders/{id}/confirm
POST   /api/v1/orders/{id}/cancel
POST   /api/v1/orders/{id}/items             → add item to open order
DELETE /api/v1/orders/{id}/items/{item_id}
POST   /api/v1/orders/{id}/payment
POST   /api/v1/orders/{id}/refund
POST   /api/v1/orders/{id}/split-bill
```

### Menu (`/api/v1/menu/`)
```
GET    /api/v1/menu/categories
POST   /api/v1/menu/categories
GET    /api/v1/menu/items
POST   /api/v1/menu/items
GET    /api/v1/menu/items/{id}
PATCH  /api/v1/menu/items/{id}
POST   /api/v1/menu/items/{id}/eighty-six
POST   /api/v1/menu/items/{id}/restore
GET    /api/v1/menu/branch-overrides/{branch_id}
PUT    /api/v1/menu/branch-overrides/{branch_id}/{item_id}
POST   /api/v1/menu/sync                     → trigger platform sync
```

### Reservations (`/api/v1/reservations/`)
```
GET    /api/v1/reservations
POST   /api/v1/reservations
GET    /api/v1/reservations/{id}
PATCH  /api/v1/reservations/{id}
POST   /api/v1/reservations/{id}/arrive
POST   /api/v1/reservations/{id}/seat
POST   /api/v1/reservations/{id}/cancel
GET    /api/v1/floor-plan/{branch_id}
PATCH  /api/v1/floor-plan/{branch_id}
POST   /api/v1/tables/{id}/seat
POST   /api/v1/tables/{id}/clear
GET    /api/v1/waitlist/{branch_id}
POST   /api/v1/waitlist
POST   /api/v1/waitlist/{id}/seat
```

### Platform admin (`/api/platform/`)
```
GET    /api/platform/tenants
POST   /api/platform/tenants
GET    /api/platform/tenants/{id}
PATCH  /api/platform/tenants/{id}
POST   /api/platform/tenants/{id}/suspend
GET    /api/platform/subscriptions
POST   /api/platform/plans
```

## Broadcasting Auth

```
POST   /api/v1/broadcasting/auth     ← Reverb channel authorisation
```

Private channel authorisation checks:
- The user's token is valid
- The channel's tenant_id matches the user's tenant_id
- The channel's branch_id is in the user's allowed branch_ids
