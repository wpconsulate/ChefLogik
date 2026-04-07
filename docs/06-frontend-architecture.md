# Frontend Architecture — React + TypeScript + MobX-State-Tree

## Core Principles

1. **MST owns all server state.** Never use `useState` or `useReducer` for data that comes from the API. MST stores are the single source of truth.
2. **TypeScript strict mode.** Every file. No `any`. No type assertions without comment.
3. **Permission checks are ubiquitous.** Every privileged UI element checks `authStore.can('slug')`. Missing a check is a bug.
4. **WebSocket updates flow into stores.** Reverb events call store actions directly — components re-render automatically via MST reactivity.

---

## AuthStore — The Foundation

```typescript
// stores/AuthStore.ts
const AuthStore = types
  .model('AuthStore', {
    userId: types.maybeNull(types.string),
    tenantId: types.maybeNull(types.string),
    tenantName: types.maybeNull(types.string),
    roleSlug: types.maybeNull(types.string),
    branchIds: types.array(types.string),      // empty = all branches (owner)
    permissions: types.array(types.string),    // flat list of permission slugs
    isAuthenticated: types.optional(types.boolean, false),
    currentBranchId: types.maybeNull(types.string),
  })
  .views(self => ({
    // Core permission check — use this everywhere
    can(permission: string): boolean {
      return self.permissions.includes(permission);
    },
    canAny(permissions: string[]): boolean {
      return permissions.some(p => self.permissions.includes(p));
    },
    canAll(permissions: string[]): boolean {
      return permissions.every(p => self.permissions.includes(p));
    },
    get isOwner(): boolean {
      return self.roleSlug === 'owner';
    },
    get hasAllBranchAccess(): boolean {
      return self.branchIds.length === 0;  // empty = all
    },
  }))
  .actions(self => ({
    async login(email: string, password: string) {
      const response = await AuthService.login(email, password);
      self.userId = response.user.id;
      self.tenantId = response.user.tenantId;
      self.permissions = response.user.permissions;
      self.branchIds = response.user.branchIds;
      self.isAuthenticated = true;
      // Initialise WebSocket with tenant context
      initEcho(response.token, response.user.tenantId);
    },
    logout() {
      // Clear all stores
      getRoot(self).reset();
    },
  }));
```

## RootStore

```typescript
// stores/RootStore.ts
const RootStore = types
  .model('RootStore', {
    auth: types.optional(AuthStore, {}),
    orders: types.optional(OrderStore, {}),
    menu: types.optional(MenuStore, {}),
    reservations: types.optional(ReservationStore, {}),
    inventory: types.optional(InventoryStore, {}),
    customers: types.optional(CustomerStore, {}),
    events: types.optional(EventStore, {}),
    analytics: types.optional(AnalyticsStore, {}),
    staff: types.optional(StaffStore, {}),
    ui: types.optional(UIStore, {}),
  })
  .actions(self => ({
    reset() {
      // Called on logout — reset all stores to initial state
      applySnapshot(self, {});
    },
  }));

// Singleton + React context
const rootStore = RootStore.create({});
const RootStoreContext = createContext(rootStore);

export const useStore = () => useContext(RootStoreContext);
export const useAuthStore = () => useStore().auth;
export const useOrderStore = () => useStore().orders;
// etc.
```

## PermissionGate Component

```typescript
// components/guards/PermissionGate.tsx
interface PermissionGateProps {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export const PermissionGate = observer(({ permission, fallback = null, children }: PermissionGateProps) => {
  const { auth } = useStore();
  return auth.can(permission) ? <>{children}</> : <>{fallback}</>;
});

// Usage
<PermissionGate permission="orders.cancel">
  <CancelOrderButton orderId={order.id} />
</PermissionGate>

<PermissionGate permission="analytics.owner_dashboard" fallback={<BranchDashboard />}>
  <OwnerDashboard />
</PermissionGate>
```

## WebSocket Integration

```typescript
// websocket/channels/orderChannel.ts
export function subscribeToOrderChannel(tenantId: string, branchId: string, store: IOrderStore) {
  const channel = echo.private(`tenant.${tenantId}.branch.${branchId}.orders`);

  channel
    .listen('OrderStatusChanged', (payload: OrderStatusPayload) => {
      store.updateStatus(payload.orderId, payload.status);
    })
    .listen('NewOrderReceived', (payload: NewOrderPayload) => {
      store.addOrder(payload.order);
      store.ui.playNewOrderSound();
    })
    .listen('OrderModified', (payload: OrderModifiedPayload) => {
      store.updateOrder(payload.orderId, payload.changes);
    });

  return () => channel.unsubscribe();
}

// In the OrderStore
.actions(self => ({
  subscribeToChannel() {
    const { auth } = getRoot(self);
    if (!auth.tenantId || !auth.currentBranchId) return;

    self.unsubscribeFromChannel = subscribeToOrderChannel(
      auth.tenantId,
      auth.currentBranchId,
      self
    );
  },
  unsubscribeFromChannel: types.optional(types.frozen(), null),
}))
```

## API Service Layer

```typescript
// api/services/OrderService.ts
import { apiClient } from '../client';
import type { Order, CreateOrderPayload, PaginatedResponse } from '../../types/api';

export const OrderService = {
  async getActive(branchId: string): Promise<Order[]> {
    const { data } = await apiClient.get<{ data: Order[] }>('/orders', {
      params: { branch_id: branchId, status: 'active' }
    });
    return data.data;
  },

  async create(payload: CreateOrderPayload): Promise<Order> {
    const { data } = await apiClient.post<{ data: Order }>('/orders', payload);
    return data.data;
  },

  async cancel(orderId: string, reason: string): Promise<Order> {
    const { data } = await apiClient.post<{ data: Order }>(`/orders/${orderId}/cancel`, { reason });
    return data.data;
  },
};

// api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
  headers: { 'Accept': 'application/json' },
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  const branchId = sessionStorage.getItem('current_branch_id');

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (branchId) config.headers['X-Branch-Id'] = branchId;

  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      rootStore.auth.logout();
    }
    return Promise.reject(error);
  }
);
```

## Routing — Role-Gated Pages

```typescript
// App.tsx
const App = observer(() => {
  const { auth } = useStore();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Staff — requires auth */}
      <Route element={<RequireStaffAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Orders — all staff with orders.view */}
        <Route element={<RequirePermission permission="orders.view" />}>
          <Route path="/orders" element={<OrdersPage />} />
        </Route>

        {/* Analytics — only with dashboard permission */}
        <Route element={<RequirePermission permission="analytics.owner_dashboard" />}>
          <Route path="/analytics/owner" element={<OwnerDashboard />} />
        </Route>

        {/* Platform admin — separate layout */}
        <Route element={<RequirePlatformAdmin />}>
          <Route path="/platform/*" element={<PlatformAdminLayout />} />
        </Route>
      </Route>

      {/* Customer portal */}
      <Route element={<RequireCustomerAuth />}>
        <Route path="/my-account/*" element={<CustomerPortalLayout />} />
      </Route>
    </Routes>
  );
});
```
