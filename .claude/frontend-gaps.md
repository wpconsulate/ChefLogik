# Frontend Gaps — Features in Backend Not Yet in UI

> Last audited: 2026-05-01
> Method: compared UI/ JSX files against docs/04-api-design.md, docs/08-build-phases.md, docs/modules/*.md, docs/user-flows.md, docs/05-auth-roles.md, docs/09-cross-module-rules.md, and docs/10-integrations.md.

---

## 1. Orders & Deliveries

| Gap | Detail |
|---|---|
| **Wrong channel: DoorDash → Wolt** | Kanban filter and order cards still say `DoorDash`. Decision 22 replaced DoorDash with Wolt. |
| **Dine-in end stages missing** | Backend has `served` and `bill_settled` stages. UI jumps from Ready → Dispatched → Completed. Dine-in flow needs Serve and Settle actions. |
| **Delivery end stages missing** | `out_for_delivery` and `delivered` stages have no UI buttons. |
| **Line item management** | No UI to add, modify, or remove items from an open (pre-preparation) order. |
| **Payment creation** | No POS payment screen — no create PaymentIntent, no Stripe Terminal flow, no payment method selection. |
| **Split bill** | No split-bill screen or UI flow. |
| **Promo codes** | No promo code list, create/edit, or checkout validation UI. |
| **Delivery zones** | No delivery zone CRUD (create, edit, delete) and no per-zone pause/resume. |
| **Platform pause/resume** | No "Pause all delivery platforms" button anywhere in the UI. API: `POST /api/v1/orders/pause-platforms` and `POST /api/v1/orders/resume-platforms`. Resume is equally absent. |
| **Auto-pause threshold config** | No UI to configure the per-branch order-count threshold that triggers an automatic platform pause (stored in `branches.settings` JSONB). |
| **Order channel badge** | No visual badge distinguishing the 7 order channels (dine_in_pos, dine_in_qr, takeaway_counter, takeaway_phone, online, uber_eats, wolt) on Kanban cards or list rows. |
| **Order disputes** | No dispute list or respond-to-dispute UI. |
| **Order status history** | No timeline view showing the full status-transition log for an order. |
| **Refund UI** | No refund action wired to any screen. |
| **New Order form** | "New Order" button exists in Orders screen but no form/modal. |
| **Idempotency-Key header** | API requires `Idempotency-Key: {client-uuid}` on order creation and payment creation to prevent duplicates on retry. No client-side UUID generation or header injection is implemented. |

---

## 2. Staff Management

| Gap | Detail |
|---|---|
| **Shift scheduling** | No shift calendar, no create/edit/delete shift, no publish-week action, no claim-open-shift. |
| **Attendance & time tracking** | No clock-in / clock-out UI, no attendance records list. |
| **Payroll export** | No CSV export button with date-range picker. |
| **Role builder** | Permissions tab shows static read-only toggles. No create/edit/delete custom role page, no permission-group UI with module grouping. |
| **Role assignment flow** | No UI to assign a role + specific branch_ids to a staff member. |
| **Offboard staff** | No offboard action (suspend → revoke tokens → inactive). |
| **Owner management** | No UI to create additional business owners (`POST /api/v1/staff/owners`). |
| **Leave management** | `staff.manage_leave` permission is seeded but there is no leave request list, leave apply form, or leave approval workflow anywhere in the UI. |
| **Staff document management** | No document upload form, document type selector (driving_licence / food_hygiene / right_to_work), expiry date field, or delete document action on a staff member's profile. |
| **Document expiry indicator** | No per-staff-member expiry status badge on the staff list or profile page (document expiry alerts are tracked in `users.documents` JSONB). |

---

## 3. Menu Management

| Gap | Detail |
|---|---|
| **Modifier groups & modifiers** | No UI at all — no CRUD for modifier groups or individual modifiers. |
| **Branch Overrides tab** | Tab exists in the UI but content is entirely unbuilt. |
| **Platform Sync tab** | Tab exists but has no content — no trigger-sync button, no last-synced status. |
| **86 history per item** | No "View 86 history" link for an individual menu item. |
| **Sub-categories CRUD** | Menu hierarchy is Category → Sub-category → Item (via `parent_id` FK on `menu_categories`). No UI to create or edit sub-categories — only top-level categories can be seen. |
| **Category CRUD** | No form to add or edit a category (only a static sidebar list). |
| **Item edit/add form** | "Add Item" button and "Edit" on cards exist but no form/modal is implemented. |
| **Allergen / dietary flags form** | `menu.edit_allergens` is an owner-only permission. No form to set allergen flags or dietary flags on a menu item — these fields are safety-critical and must be gated to owner only. |
| **QR code per branch** | Each branch has a public menu URL (`/api/public/menu/{branch_slug}`). No UI to display or download the per-branch QR code. |
| **Item cost / margin display** | `menu.view_costs` permission — no cost price column or gross margin % shown on menu items for users who hold this permission. |
| **Auto-restore mode for 86** | When manually 86ing an item, no option to select auto-restore mode (time-based or next-open). Existing 86'd items also have no UI to configure or change restore mode. |

---

## 4. Reservations

| Gap | Detail |
|---|---|
| **Lifecycle action buttons** | Reservation list shows status only. No Arrive, Seat, Complete, No-show, or Cancel action buttons on any row. |
| **New Reservation form** | "New Reservation" button on Dashboard and no form exists (date / time / party size / table / customer). |
| **Availability checker** | No UI for `GET /reservations/availability` — no "find available tables for date/time/party" tool. |
| **Reservation detail view** | No expandable/clickable row to show full notes, customer contact, deposit status, or linked order. |
| **Special operating hours** | No UI to add/edit branch-level special hours overrides. |

---

## 5. Events & Functions

| Gap | Detail |
|---|---|
| **Phase transitions beyond Confirmed** | Kanban shows Enquiry → Proposal → Deposit → Confirmed. No Pre-event, Day-of, or Complete buttons/phase. |
| **Pre-event tasks** | No task list per event, no add/edit task, no mark-complete action. |
| **Run sheet** | No run sheet view or PDF export trigger. |
| **Event packages** | No packages list or CRUD. |
| **Event spaces** | No spaces list or CRUD. |
| **Corporate accounts** | No corporate accounts list or CRUD. |
| **Mark Lost** | No "Mark as Lost" action with reason selection. |
| **Deposit collection** | No Stripe deposit payment trigger in event detail. |
| **Linked orders** | No view of orders linked to an event. |
| **Cancel event** | No cancel action with cancellation-policy fee handling. |
| **Recurring events** | No UI to create a recurring (parent) event with a `recurrence_rule`, or to list the auto-generated child occurrences. Cancelling individual child vs. whole series is also unimplemented. |
| **Minimum spend tracking** | No actual_spend vs minimum_spend real-time comparison on event detail. No bill-close prompt when actual_spend falls short of the minimum. |

---

## 6. Inventory & Kitchen

| Gap | Detail |
|---|---|
| **Inventory item CRUD** | Inventory list displays items but there is no form to create, edit, or delete an inventory item (name, SKU, unit, par_level, reorder_point, critical_threshold, storage_location, allergen_flags). |
| **Stock alert thresholds** | No UI to configure `reorder_point`, `critical_threshold`, and `par_level` per inventory item. Requires `inventory.configure_alerts` permission and should be part of the item edit form. |
| **Recipes** | No recipe list, create/edit form, or approval workflow (Submit → Approve → Archive). |
| **Suppliers** | No supplier list or CRUD. |
| **Purchase orders** | No PO list, create form, send-to-supplier action, or cancel. |
| **Goods Received Notes (GRN)** | No GRN create, receive/confirm action, or temperature logging. |
| **Waste logging** | No waste log entry form (6 waste types, snaps WAC at log time). |
| **Stocktake workflow** | No start-stocktake, count-entry, complete, or lock (period close) UI. |
| **Stock adjustment** | No manual stock adjustment form for an inventory item. |
| **Stock transfer** | No inter-branch stock transfer UI. |
| **Stock movement history** | No cursor-paginated movement history view per item. |
| **Temperature log export** | No export trigger for food-safety temperature logs. |
| **KDS: item-level mark prepared** | KDS tickets have Acknowledge and a single Mark Ready button. No per-item "mark prepared" action. |
| **KDS: allergen acknowledgement logging** | UI dismisses the banner but doesn't show the 30-second hard gate as a blocking requirement or log it immutably. |
| **KDS station filter** | No station selector — tickets are shown for all stations. |

---

## 7. Customers & Loyalty

| Gap | Detail |
|---|---|
| **Customer detail view** | Customers list is a flat table with no clickable profile page. |
| **Loyalty: points adjust** | No manual points adjustment form. |
| **Loyalty: redeem at POS** | No points redemption UI during POS checkout. |
| **Order & reservation history** | No order history or reservation history view per customer. |
| **Duplicate merge** | No merge-duplicate-profiles UI. |
| **GDPR: erasure request** | No initiate-erasure button. |
| **GDPR: data export** | No trigger for async GDPR data export. |
| **Campaigns** | No campaign list, create, or cancel UI. |
| **Customer enrolment from POS** | No "enrol customer" action during order flow. |
| **Points expiry status** | No display of whether a customer's points are approaching the 12-month inactivity warning or the 18-month forfeiture. |
| **Tier progress indicator** | No "X spend / Y visits to next tier" progress bar or indicator in the customer profile view. |
| **Communication preferences** | No UI to view or update a customer's `communication_prefs` JSONB (sms_marketing, email_marketing, push_notifications). Required to respect GDPR opt-outs correctly. |
| **Date of birth / birthday** | No DOB field in customer profile view or edit form. Birthday-month 2× earn bonus is invisible to staff at POS. |

---

## 8. Analytics & Reports

| Gap | Detail |
|---|---|
| **Role-gated dashboards** | UI shows a single analytics page. Backend has 5 separate dashboards (owner, branch, kitchen, events, customer) gated by different permissions. |
| **Menu engineering matrix** | No Stars/Plowhorses/Puzzles/Dogs quadrant view — only a top-dishes bar list. |
| **Churn risk list** | RFM segments shown but no drill-down into at-risk customers or churn-risk score list. |
| **Inventory analytics** | No COGS, food cost %, or waste cost report view. |
| **Staff analytics** | No labour cost % or aggregate staff performance report (beyond a static table). |
| **Tax/VAT report** | No tax report view by category and period. |
| **Audit log viewer** | No audit log viewer in the tenant UI (only in the Platform Admin panel). |
| **Async export flow** | Export button exists but no poll-for-status or download-ready handling (`GET /exports/{job_id}/status`). |
| **Financial period close** | No period-close trigger or locked-period indicator. |
| **Scheduled report delivery** | No UI to configure scheduled report email delivery. |
| **Date range picker** | Only 1M/3M/6M/1Y presets — no custom date-range input. |
| **RevPASH metric** | Revenue per Available Seat Hour (RevPASH = revenue ÷ seats × operating hours) is a key KPI in the analytics spec but is not shown on any dashboard. |
| **Metric alert thresholds** | `analytics.configure_alerts` permission — no UI to set alert thresholds for food cost %, labour cost %, churn risk score, or revenue targets. |
| **Custom report builder** | `analytics.custom_reports` permission is seeded but there is no ad-hoc report building UI. |

---

## 9. Tables & Floor Plan

| Gap | Detail |
|---|---|
| **Floor plan editor** | Floor plan is view-only. No drag-to-move tables, no add/remove table, no save layout (`PATCH /floor-plan/{branch_id}`). |
| **Block / Unblock table** | No block or unblock action on a table. |
| **Table state transitions: needs cleaning** | No "Mark needs cleaning" button on an occupied table (occupied → needs_cleaning transition). No "Clear table" button when a table is in needs_cleaning state (needs_cleaning → free). Both transitions are defined in the state machine but have no UI action. |
| **Waitlist: seat from waitlist** | No "Seat" button to transition a waitlist entry to seated and link it to a table (`POST /api/v1/waitlist/{id}/seat`). |
| **Waitlist: ETA display** | Waitlist shows wait time but no calculated ETA from the availability algorithm. |
| **Waitlist: remove** | No "remove from waitlist" (mark as left/expired) action. |
| **Table list view** | "List View" toggle exists but the view content is not implemented. |

---

## 10. Auth & Onboarding

| Gap | Detail |
|---|---|
| **Password reset flow (staff)** | `forgot-password` → `reset-password` flow is mocked in the login UI but not wired to API. |
| **Token refresh** | No silent token refresh before expiry (`POST /auth/refresh`). |
| **Customer login / portal** | No customer-facing login, loyalty dashboard, booking history, or GDPR self-service screens. |
| **Customer restaurant selector** | No "select restaurant context" screen after customer login. |
| **Tenant onboarding wizard** | First-time onboarding UI exists in `cl-login.jsx` but stops at "invite team" — no branch setup step. |
| **Change password (staff)** | No "change my password" page for an authenticated staff member. |
| **Staff own profile** | No UI for a staff member to view or edit their own name, phone, or profile photo (`GET /api/v1/auth/me` exists). |

---

## 11. Platform Admin

| Gap | Detail |
|---|---|
| **Tenant: change plan** | Detail panel has no change-plan action (`POST /api/platform/tenants/{id}/change-plan`). |
| **Tenant: reactivate** | Reactivate action is missing (only Suspend and Delete are present). |
| **Subscription plans: create** | Billing screen shows Edit Plan per plan but no create-new-plan flow. |
| **Platform analytics: per-tenant drill-down** | Top Tenants list is not clickable — no per-tenant usage detail view. |
| **Feature flags: API wiring** | Feature flags screen renders mock data — no API to create a flag, toggle active/inactive, or adjust rollout percentage. |
| **Platform admin user management** | No CRUD UI for `platform_admins` accounts (create, edit, delete platform admin users or change their roles). |
| **Tenant impersonation** | Audit log shows `tenant.impersonate` events but there is no "impersonate as tenant" action in the platform admin UI. |

---

## 12. Cross-cutting / Shell

| Gap | Detail |
|---|---|
| **WebSocket connection** | UI renders static mock data — no live WebSocket connection to Reverb for orders, tables, or KDS. |
| **Branch switcher wires X-Branch-Id** | Branch dropdown changes the display label but does not set the `X-Branch-Id` header on API calls. |
| **Permission-gated nav/UI** | `authStore.can('permission.slug')` checks are not applied — all nav items and actions are visible regardless of role. |
| **Global search** | Search bar in header is a styled input only — no results, no routing. |
| **Notifications: real alerts** | Notification dropdown shows hardcoded mock data, not live alerts from `tenant.{id}.alerts` channel. |
| **Messages inbox** | Messages dropdown is mock data — no real messaging backend. |
| **Pagination** | All list screens show full mock arrays — no page/cursor controls for large datasets. |
| **Error states** | No empty states, error banners, or retry flows on any screen. |
| **Loading states** | No skeleton loaders or spinners when data would be fetching. |

---

## 13. Branch Management

> Entirely absent from the UI. The branch switcher dropdown in the shell is the only branch-related UI.

| Gap | Detail |
|---|---|
| **Branch management page** | No dedicated page to list all branches for a tenant. There is no entry point to branch administration beyond the shell dropdown. |
| **Branch create/edit form** | No form to create a new branch or edit branch details: name, address, phone, email, timezone, currency, locale. API: `POST /api/v1/branches`, `PATCH /api/v1/branches/{id}`. |
| **Branch delete** | No delete action for a branch (`DELETE /api/v1/branches/{id}`). |
| **Branch operating hours** | No UI to configure the weekly operating hours schedule (Monday–Sunday open/close times stored in `branches.operating_hours` JSONB). |
| **Branch settings** | No UI to configure seat count, revenue targets, food cost % target, waste cost threshold, or per-platform delivery commission rates (all in `branches.settings` JSONB). These drive key analytics KPI comparisons. |
| **Special operating hours CRUD** | The gap in Reservations (section 4) notes the absence — the full CRUD lives here: list (`GET /api/v1/branches/{id}/hours`), add, update by date, delete by date. |

---

## 14. Integrations Setup

> No integrations configuration screen exists anywhere in the tenant UI. All credentials live in `tenant_integrations` but cannot be managed by a tenant.

| Gap | Detail |
|---|---|
| **Uber Eats connection** | No UI to enter or save Uber Eats API credentials (client_id, client_secret, store_id) into `tenant_integrations`. Without this, Uber Eats webhook order ingestion and menu sync cannot be tenant-configured. |
| **Wolt connection** | No UI to enter or save Wolt API credentials (client_id, client_secret, venue_id). Decision 22 confirmed Wolt replaces DoorDash. |
| **Stripe Terminal setup** | No UI to configure Stripe Terminal reader pairing. Required for in-person POS payments. |
| **Twilio configuration** | No UI to configure Twilio account credentials (Decision 8 confirmed). Required for SMS reservation reminders and customer OTP flows. |
| **Integration health / last synced** | No view of `last_synced_at`, active/inactive status, or connection health per integration — needed to diagnose failed platform syncs or missed deliveries. |
