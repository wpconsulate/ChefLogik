# Tech Stack & Coding Standards

## Backend — Laravel 12 / PHP 8.3

### Required packages
```json
{
  "require": {
    "php": "^8.3",
    "laravel/framework": "^12.0",
    "laravel/sanctum": "^4.0",
    "laravel/reverb": "^1.0",
    "laravel/horizon": "^5.0",
    "stancl/tenancy": "^3.0",
    "spatie/laravel-permission": "NOT USED — custom permission system",
    "stripe/stripe-php": "^13.0",
    "twilio/sdk": "^8.0",
    "sendgrid/sendgrid": "^8.0",
    "league/flysystem-aws-s3-v3": "^3.0"
  }
}
```

Note: spatie/laravel-permission is NOT used. The project has a custom permission system (see `docs/05-auth-roles.md`).

### Directory structure (Laravel)
```
app/
  Console/
    Commands/         ← Artisan commands (aggregation jobs, maintenance)
  Events/             ← Domain events (OrderConfirmed, TableStateChanged, etc.)
  Exceptions/         ← Custom exception classes + Handler.php
  Http/
    Controllers/
      Api/V1/         ← All API controllers, one subfolder per module
        Orders/
        Menu/
        Reservations/
        ...
      Platform/       ← Platform-admin controllers (tenant management, etc.)
    Middleware/
      TenantMiddleware.php      ← Resolves tenant from JWT, sets on request
      PermissionMiddleware.php  ← Checks permission slug against cached perms
      EnsureStaffAuth.php
      EnsureCustomerAuth.php
      EnsurePlatformAdmin.php
    Requests/         ← Form Request classes, one per endpoint
      Orders/
      Menu/
      ...
    Resources/        ← API Resources, one per model/response shape
  Jobs/               ← Queued jobs
    Orders/
    Inventory/
    Analytics/        ← Aggregation jobs (hourly, daily, weekly, monthly)
    Integrations/     ← Platform sync jobs (Uber Eats, DoorDash, Stripe webhook)
  Listeners/          ← Event listeners
  Models/             ← Eloquent models (all with TenantScope)
  Policies/           ← Laravel Policies (use permission slugs, not role names)
  Repositories/       ← Repository pattern — one per major model
    Contracts/        ← Repository interfaces
  Services/           ← Business logic services
    Orders/
    Menu/
    Inventory/
    Loyalty/
    Analytics/
    Integrations/
      StripeService.php
      UberEatsService.php
      DoorDashService.php
      TwilioService.php
      SendGridService.php
  Enums/              ← PHP 8.1+ backed enums for all status fields
database/
  migrations/         ← Chronological migrations
  seeders/
    PermissionSeeder.php    ← Seeds all permission slugs
    SystemRoleSeeder.php    ← Seeds the 8 system roles with their permissions
    PlatformAdminSeeder.php
config/
  tenancy.php         ← stancl/tenancy config
  permissions.php     ← Permission slug constants (the only place slugs are defined)
routes/
  api.php             ← Tenant-scoped API routes (/api/v1/)
  platform.php        ← Platform-admin routes (/api/platform/)
  channels.php        ← Reverb/broadcasting channel definitions
tests/
  Feature/            ← API endpoint tests (one per controller method)
  Unit/               ← Service and repository unit tests
  TenantTestCase.php  ← Base test case that sets up tenant isolation for every test
```

### Laravel conventions
```php
// Always declare strict types
declare(strict_types=1);

// Use PHP 8.3 readonly properties in DTOs
final readonly class CreateOrderDTO {
    public function __construct(
        public string $tenantId,
        public string $branchId,
        public OrderSource $source,
        // ...
    ) {}
}

// Use enums for all status fields
enum OrderStatus: string {
    case New = 'new';
    case Confirmed = 'confirmed';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case OutForDelivery = 'out_for_delivery';
    case Delivered = 'delivered';
    case Served = 'served';
    case BillSettled = 'bill_settled';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}

// Repository pattern — never query in controllers
class OrderRepository implements OrderRepositoryInterface {
    public function findByRef(string $tenantId, string $ref): Order { ... }
    public function getActiveForBranch(string $branchId): Collection { ... }
}

// Service pattern — all business logic here
class OrderService {
    public function confirm(Order $order): void {
        // Validate transition
        // Fire OrderConfirmed event
        // Job dispatched by listener: DeductStock, UpdateKDS
    }
}

// API Resources — always use these, never toArray() in controllers
class OrderResource extends JsonResource {
    public function toArray(Request $request): array { ... }
}

// Form Requests — all validation here, never in controllers
class CreateOrderRequest extends FormRequest {
    public function rules(): array { ... }
    public function authorize(): bool {
        return $this->user()->can('orders.create');
    }
}
```

### API response format (all endpoints follow this)
```json
// Success (single resource)
{
  "data": { ... },
  "meta": { "version": "1.0" }
}

// Success (collection)
{
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 142,
    "last_page": 6
  }
}

// Error
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "The requested order does not exist.",
    "details": {}
  }
}

// Validation error (422)
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The given data was invalid.",
    "details": {
      "table_id": ["The selected table is not available."]
    }
  }
}
```

### Queue configuration
- Driver: Redis (Laravel Horizon)
- Queues (in priority order):
  - `critical` — Stripe webhooks, 86 broadcasts, KDS updates
  - `high` — Order status updates, platform sync (86 to Uber/DoorDash)
  - `default` — Email/SMS notifications, customer profile updates
  - `analytics` — Aggregation jobs (hourly, daily, weekly, monthly)
  - `low` — Report generation, export jobs

---

## Frontend — React 18 / TypeScript / MobX-State-Tree

### Key packages
```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^6",
    "mobx": "^6",
    "mobx-react-lite": "^4",
    "mobx-state-tree": "^5",
    "typescript": "^5.4",
    "axios": "^1.7",
    "laravel-echo": "^1.16",
    "pusher-js": "^8"
  }
}
```

Note: `pusher-js` is used as the client library for Laravel Reverb (Reverb is Pusher-protocol compatible).

### Directory structure (React)
```
src/
  api/
    client.ts           ← Axios instance with auth interceptors + tenant headers
    services/
      OrderService.ts   ← Typed API calls for orders module
      MenuService.ts
      ...               ← One service file per module
  stores/
    RootStore.ts        ← MST RootStore, creates and exposes all sub-stores
    AuthStore.ts        ← User, tenant, permissions[], can() method
    OrderStore.ts
    MenuStore.ts
    ReservationStore.ts
    InventoryStore.ts
    CustomerStore.ts
    EventStore.ts
    AnalyticsStore.ts
    StaffStore.ts
    UIStore.ts          ← Loading states, modals, toasts
  models/               ← MST model definitions
    Order.ts
    MenuItem.ts
    Reservation.ts
    Customer.ts
    ...
  components/
    common/             ← Shared components (Button, Modal, Badge, etc.)
    layout/             ← AppShell, Sidebar, Header, BranchSwitcher
    guards/
      PermissionGate.tsx  ← Wraps any component that needs a permission check
      RoleGate.tsx
  pages/
    orders/
    menu/
    reservations/
    events/
    inventory/
    customers/
    analytics/
    staff/
    settings/
    platform-admin/     ← Only visible to platform admins
    customer-portal/    ← Customer-facing loyalty and booking views
    auth/               ← Login, forgot password, etc.
  hooks/
    usePermission.ts    ← Returns authStore.can(slug) for hooks-based checking
    useWebSocket.ts     ← Wraps Laravel Echo subscription
    useTenant.ts        ← Returns current tenant context
  websocket/
    echo.ts             ← Laravel Echo + Reverb initialisation
    channels/           ← Channel subscription helpers per module
  types/
    api.ts              ← API response types
    models.ts           ← Frontend model types (mirror of MST models)
  utils/
    currency.ts
    dateTime.ts
    permissions.ts      ← Permission slug constants (mirrors backend)
```

### MST patterns

```typescript
// Every MST model mirrors the API resource shape
const OrderModel = types.model('Order', {
  id: types.identifier,
  orderRef: types.string,
  status: types.enumeration('OrderStatus', Object.values(OrderStatus)),
  source: types.enumeration('OrderSource', Object.values(OrderSource)),
  branchId: types.string,
  total: types.number,
  // ...
})
.views(self => ({
  get isActive() {
    return !['completed', 'cancelled'].includes(self.status);
  }
}))
.actions(self => ({
  setStatus(status: OrderStatus) {
    self.status = status;
  }
}));

// Store handles all fetching — never fetch in components
const OrderStore = types.model('OrderStore', {
  orders: types.map(OrderModel),
  isLoading: types.optional(types.boolean, false),
})
.actions(self => ({
  async fetchActive(branchId: string) {
    self.isLoading = true;
    const orders = await OrderService.getActive(branchId);
    orders.forEach(o => self.orders.set(o.id, o));
    self.isLoading = false;
  },
  updateFromWebSocket(payload: OrderStatusPayload) {
    const order = self.orders.get(payload.orderId);
    if (order) order.setStatus(payload.status);
  }
}));

// Permission checking in components
const CancelOrderButton = observer(({ orderId }: { orderId: string }) => {
  const { authStore } = useStore();
  if (!authStore.can('orders.cancel')) return null;
  return <button onClick={() => cancelOrder(orderId)}>Cancel</button>;
});

// PermissionGate component
const PermissionGate = ({ permission, children }: { permission: string; children: ReactNode }) => {
  const { authStore } = useStore();
  return authStore.can(permission) ? <>{children}</> : null;
};
```

### TypeScript strict mode
```typescript
// tsconfig.json — enforce all of these
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### WebSocket (Laravel Reverb via Laravel Echo)

```typescript
// echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

export const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  wssPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
  authEndpoint: '/api/v1/broadcasting/auth',
});

// Channel naming convention: always tenant-scoped
// `tenant.{tenantId}.branch.{branchId}.orders`  → order status updates
// `tenant.{tenantId}.branch.{branchId}.tables`  → table state updates
// `tenant.{tenantId}.branch.{branchId}.kds`     → KDS ticket updates
// `tenant.{tenantId}.alerts`                    → manager alerts
```
