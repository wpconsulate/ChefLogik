# Module: Inventory & Kitchen
Full requirements: 96 numbered requirements (IK-01 through NF-IK-12).

## WAC Calculation (Weighted Average Cost)
new_wac = (existing_stock × old_wac + received_qty × unit_cost) / (existing_stock + received_qty)
Recalculated on EVERY GRN line item confirmation. Updates inventory_items.wac immediately.
Also updates menu_items.cost_price for all recipes using this ingredient.

## Stock Deduction Flow
Trigger: OrderConfirmed event
Job: DeductStockJob (on 'critical' queue)
For each item in the order: look up recipe → for each ingredient → deduct quantity × recipe.quantity
If ingredient reaches zero: trigger ItemEightySixed event (inventory-linked trigger_type)
If ingredient not found in inventory: log warning, continue (do NOT rollback the order)

## Inventory-Linked 86 Rule (CRITICAL)
When stock hits zero → auto-86 fires → eighty_six_log record created with trigger_type='inventory_stockout'
This 86 CANNOT be auto-restored by the time-based or next-open modes in Menu Management.
Restoration requires: manager manually confirms ingredient is available → calls restore endpoint
The restore endpoint checks trigger_type and requires manual confirmation for inventory-linked 86s.

## KDS Integration
Channel: tenant.{tid}.branch.{bid}.kds
Tickets broadcast on order confirmation, organised by station (grill, fryer, cold, pass).
Allergen acknowledgement: hard gate — item cannot be marked 'prepared' until acknowledged.
Acknowledgement SLA: 30 seconds. Unacknowledged after 30s: escalation alert to pass manager.
All acknowledgements logged immutably.

## Recipe States
draft → pending_approval → approved → archived
Only 'approved' recipes trigger stock deductions.
Master menu recipes: approved by Owner.
Branch-exclusive recipes: approved by Branch Manager.
Orders for items with only 'draft' recipes: KDS fires but no stock deduction (manager alerted).

## Waste Logging
6 types: spoilage | prep | service | overproduction | unaccounted | staff_meal
Each log entry: item, quantity, cost_at_wac (snapshotted from current WAC at log time), type, notes, actor.

## Temperature Logging
GRN items record temperature_celsius and temperature_status (pass/fail/borderline).
Export available as PDF/CSV for environmental health inspection (IK-56A).
Records retained 7 years minimum.

## Stocktake & Period Close
Stocktake: counts all inventory items, calculates variance against system stock.
Variance explanations: unrecorded_waste | portioning | short_delivery | theft | counting_error
Period close: requires completed stocktake. Locks period data. Finalises COGS.
Only Owner can reopen a closed period (logged with reason).
