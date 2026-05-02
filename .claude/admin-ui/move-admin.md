# Plan: Standalone Platform Admin App (`/admin`)

## Context
The Platform Admin UI currently lives embedded inside `/web` (the staff-facing React app). This creates unnecessary coupling — platform admin sessions share the same Vite bundle, routing tree, and MST root store as restaurant staff. The goal is to extract all platform-admin code into a **fully independent Vite app at `/admin`**, matching the richer design from `UI/ChefLogik Admin.html` (sidebar shell, 9 screens), with a login page that blends the split-panel layout from `UI/ChefLogik.html` and the dark-indigo admin aesthetic.

---

## Design Spec Summary

### Color palette (ADM tokens → Tailwind CSS vars)
| Token | Hex | Role |
|---|---|---|
| `--adm-bg` | `#F4F6F9` | Page background |
| `--adm-card` | `#FFFFFF` | Cards |
| `--adm-sidebar` | `#1E293B` | Sidebar |
| `--adm-accent` | `#6366F1` | Primary accent |
| `--adm-accent-light` | `#EEF2FF` | Accent fills |
| `--adm-text` | `#0F172A` | Body text |
| `--adm-muted` | `#64748B` | Secondary text |
| `--adm-border` | `#E2E8F0` | Borders |
| `--adm-success` | `#16A34A` | Green |
| `--adm-danger` | `#DC2626` | Red |
| `--adm-warning` | `#D97706` | Amber |

### Login design
- **Split layout** (from `cl-login.jsx`): 52% left + 48% right
- **Left brand panel**: dark indigo `#1E293B` + radial grid pattern (from `cl-admin-shell.jsx` login), decorative rings, "CL" logo, "ChefLogik" + "Platform Admin" badge, security-focused headline
- **Right form panel**: light grey bg, white card, two-step form (email/password → 6-box MFA OTP)

### Shell design (from `cl-admin-shell.jsx`)
- **Sidebar**: fixed left, collapsible (expanded 220px / compact 64px), grouped nav, user footer
- **Header**: breadcrumb path, "All systems operational" status pill, notification bell, admin avatar + logout

### Nav structure (9 screens, 4 groups)
```
Overview:   Dashboard · Tenants · Billing & Plans
Platform:   System Health · Feature Flags · Platform Analytics
Access:     Users & Roles · Audit Logs
Support:    Support Tickets
```

---

## Implementation Plan

### Phase 1 — Bootstrap `/admin` app

**Create `/admin/package.json`**
Copy dependencies from `/web/package.json` and strip:
- Remove: `laravel-echo`, `pusher-js` (no WebSocket in admin app)
- Remove: `@base-ui/react` (not needed)
- Keep: `react`, `react-dom`, `@tanstack/react-router`, `mobx`, `mobx-react-lite`, `mobx-state-tree`, `axios`, `lucide-react`, `tailwindcss`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`, `tw-animate-css`, `shadcn`, `@fontsource-variable/plus-jakarta-sans`
- Change app name to `"admin"`

**Create config files** (copy + adjust from `/web`):
- `vite.config.ts` — port `5502`, same plugins (TanStackRouterVite, react, tailwindcss), `@` alias
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` — identical to `/web`
- `eslint.config.js` — identical to `/web`
- `components.json` — identical to `/web`
- `index.html` — title "ChefLogik Admin", point to `/src/main.tsx`
- `.env.example` — `VITE_API_URL=http://localhost:8000/api/v1` + `VITE_STAFF_APP_URL=http://localhost:5500`

**Create `src/index.css`**
Fixed admin color palette (no user-switchable themes) using CSS custom properties mapping to ADM tokens. Font: Plus Jakarta Sans.

---

### Phase 2 — Move platform code from `/web` → `/admin`

**Copy** these files verbatim from `/web/src` to `/admin/src`:
- `types/platform.ts`
- `services/platformApi.ts`
- `services/PlatformService.ts`
- `stores/PlatformStore.ts`

**Adapt** `PlatformStore.ts`:
- Change `launchImpersonation()`: open a new browser tab via `window.open(...)` instead of `navigate({ to: '/dashboard' })`
- Since `/admin` and `/web` run on different origins, `localStorage` is **not shared**. Pass the token via URL query params:
  ```ts
  const url = `${VITE_STAFF_APP_URL}/dashboard?impersonate_token=${token}&tenant_name=${encodeURIComponent(tenantName)}`
  window.open(url, '_blank')
  ```

**Create** `/admin/src/stores/context.tsx`
Admin-only store context: a single `PlatformStore` instance (no RootStore).

**Create** `/admin/src/main.tsx`
- Bootstrap: `platform.rehydrate()` then `createRoot()`
- Wire `platformApi.onUnauthorized` → `platform.logout()` + router navigate to `/login`
- No `api`, no `customerPortal`, no `profile.fetchProfile`

---

### Phase 3 — Routing

**Create** `/admin/src/routes/__root.tsx` — minimal root with `<Outlet />`

**Create** `/admin/src/routes/login.tsx`
Full split-panel login matching the merged design:
- Left: dark indigo panel with grid, CL logo, "Platform Admin" badge, decorative rings, security tagline
- Right: light grey, white card, 2-step form (email/password with show/hide toggle → 6-box OTP)
- MFA step uses `platform.login()` from PlatformStore (the step progression is UI-only; actual API is 1 call)

**Create** `/admin/src/routes/_authenticated.tsx`
- `beforeLoad`: reads token from localStorage; if missing redirects to `/login`
- Wraps children in `<AdminShell>` (sidebar + header layout)

**Create** route files (each in `src/routes/_authenticated/`):
- `dashboard.tsx`
- `tenants.tsx` (includes New Tenant 4-step modal + slide-out detail panel)
- `billing.tsx`
- `health.tsx`
- `flags.tsx`
- `analytics.tsx`
- `users.tsx`
- `audit.tsx`
- `support.tsx`
- `index.tsx` (redirects to `/dashboard`)

---

### Phase 4 — Layout components

**Create** `/admin/src/components/layout/AdminShell.tsx`
- Holds sidebar + header + content area
- Accepts `layout` prop (`'expanded' | 'compact'`) stored in `localStorage` (persist user preference)

**Create** `/admin/src/components/layout/AdminSidebar.tsx`
- Fixed left, dark indigo (`--adm-sidebar`) background
- Grouped nav matching `ADMIN_NAV` from design
- Logo area: "CL" square + "ChefLogik" + "Platform Admin" label
- Compact: icon-only with tooltips; Expanded: icon + label + badge
- Active indicator: left-border accent strip + indigo tint background
- User footer: admin avatar (initials) + name/email
- Expand/collapse toggle button at bottom

**Create** `/admin/src/components/layout/AdminHeader.tsx`
- `position: fixed` top, left offset by sidebar width (transitions with sidebar)
- Breadcrumb: `admin.cheflogik.io / {PageLabel}`
- Status pill: green pulse + "All systems operational"
- Notification bell with badge count
- Admin avatar button → logout

---

### Phase 5 — Screen implementations

Each screen translates the corresponding section of `cl-admin-dashboard.jsx` / `cl-admin-screens.jsx` into TypeScript/Tailwind. **API-connected** screens use `PlatformStore`; **placeholder** screens use hardcoded mock data matching the design.

| Screen | File | Data source |
|---|---|---|
| Dashboard | `dashboard.tsx` | Mock (no API yet) |
| Tenants | `tenants.tsx` | **PlatformStore** (real API) |
| Billing | `billing.tsx` | Plans from **PlatformStore** + mock revenue breakdown |
| System Health | `health.tsx` | Mock |
| Feature Flags | `flags.tsx` | Mock |
| Platform Analytics | `analytics.tsx` | Mock |
| Users & Roles | `users.tsx` | Mock |
| Audit Logs | `audit.tsx` | Mock |
| Support Tickets | `support.tsx` | Mock |

**Dashboard** (`dashboard.tsx`):
- 4 KPI cards: MRR, Active Tenants, Churn Rate, Orders Processed — each with SVG sparkline
- MRR Growth chart (12-month SVG polyline)
- Plan distribution bar chart
- Recent sign-ups table
- Quick stats cards (uptime, open tickets, sign-ups, feature flags)

**Tenants** (`tenants.tsx`):
- Full data table: Name/slug, Plan badge, Branches, Staff, Orders 30d, MRR, Status badge
- Search input + status filter tabs (all/active/trial/paused/churned)
- Click row → slide-in detail panel (right side, 320px): metrics grid, feature flags list, actions (Impersonate, Suspend/Reactivate, Delete)
- New Tenant 4-step modal (Account → Restaurant → Plan & Access → Review) — real API via `PlatformStore.createTenant()`
- Suspend/Reactivate actions via `PlatformStore.suspendTenant()` / `reactivateTenant()`
- Impersonate button → `PlatformStore.startImpersonation()` + confirmation dialog → `launchImpersonation()` (cross-app navigate)

**Billing** (`billing.tsx`):
- Plan cards (Starter/Growth/Enterprise/Custom) with feature lists
- Revenue by plan breakdown table with bar indicators
- Plans loaded from `PlatformStore.fetchPlans()`

All other screens: visually faithful to design with hardcoded mock data.

---

### Phase 6 — Clean up `/web`

**Delete** from `/web`:
- `src/routes/platform/` (entire directory: index.tsx, login.tsx, tenants.tsx, $tenantId.tsx, plans.tsx)
- `src/components/layout/PlatformShell.tsx`
- `src/services/platformApi.ts`
- `src/services/PlatformService.ts`
- `src/types/platform.ts`
- `src/stores/PlatformStore.ts`

**Modify** `/web/src/stores/root.ts`:
- Remove `PlatformStore` import and the `platform` field from `RootStore`
- Remove `PlatformStore` from the reset action if needed

**Modify** `/web/src/stores/context.tsx`:
- Remove `usePlatformStore` export

**Modify** `/web/src/main.tsx`:
- Remove `platformApi` import and `onUnauthorized` wiring
- Remove `platform.rehydrate()` from the `Promise.all`

**Modify** `/web/src/components/layout/AppShell.tsx`:
- Remove `usePlatformStore` import
- Replace `platform.endImpersonation()` call with inline logic:
  ```ts
  localStorage.removeItem('cl_impersonation_tenant')
  localStorage.removeItem('cl_token')
  api.setToken(null)
  window.location.href = import.meta.env.VITE_ADMIN_URL ?? 'http://localhost:5502'
  ```
- Remove `const platform = usePlatformStore()`

**Add** `/web` impersonation URL param handler:
Modify `/web/src/routes/_authenticated.tsx` (or create a `/web/src/routes/_authenticated/dashboard.tsx` `beforeLoad`) to check for `?impersonate_token=TOKEN&tenant_name=NAME` query params on load. If present:
1. `localStorage.setItem('cl_token', token)` + `localStorage.setItem('cl_impersonation_tenant', tenantName)`
2. `api.setToken(token)`
3. Strip the params from the URL (replace history state) so they don't persist on refresh

Also add `VITE_ADMIN_URL=http://localhost:5502` to `/web/.env.example`.

---

## Files Created (summary)

**`/admin/`** — ~32 new files:
```
package.json, vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json
eslint.config.js, components.json, index.html, .env.example
src/main.tsx, src/index.css, src/lib/utils.ts
src/types/platform.ts
src/services/platformApi.ts, src/services/PlatformService.ts
src/stores/PlatformStore.ts, src/stores/context.tsx
src/routes/__root.tsx, src/routes/login.tsx, src/routes/_authenticated.tsx
src/routes/_authenticated/index.tsx
src/routes/_authenticated/dashboard.tsx
src/routes/_authenticated/tenants.tsx
src/routes/_authenticated/billing.tsx
src/routes/_authenticated/health.tsx
src/routes/_authenticated/flags.tsx
src/routes/_authenticated/analytics.tsx
src/routes/_authenticated/users.tsx
src/routes/_authenticated/audit.tsx
src/routes/_authenticated/support.tsx
src/components/layout/AdminShell.tsx
src/components/layout/AdminSidebar.tsx
src/components/layout/AdminHeader.tsx
src/components/ui/button.tsx, src/components/ui/input.tsx
```

**`/web/`** — 6 files deleted, 4 files modified.

---

## Verification

1. `cd /admin && npm install && npm run dev` — server starts on port 5502
2. Navigate to `http://localhost:5502/login` — split-panel login with dark indigo left side
3. Sign in with admin credentials — redirects to `/dashboard` with sidebar nav
4. Test sidebar collapse toggle — 220px ↔ 64px transition
5. Navigate to each of the 9 screens — all render with correct design
6. Tenants screen: search, filter, click row (detail panel opens), create tenant (4-step modal), suspend/reactivate
7. Impersonate a tenant → **new tab** opens at `http://localhost:5500/dashboard?impersonate_token=...&tenant_name=...` with amber impersonation banner
8. Click "End Impersonation" in staff app → clears localStorage + redirects current tab to `http://localhost:5502` (admin app)
9. `cd /web && npm run dev` — staff app still starts, platform routes gone, no TypeScript errors
10. `cd /web && npm run test` — test suite passes
