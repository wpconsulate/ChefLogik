# Module: Table & Reservation Management
Full requirements: 88 numbered requirements (TR-01 through NF-TR-12).

## 5 Table States
free → reserved → occupied → needs_cleaning → blocked
Valid transitions enforced as a state machine. Invalid transitions return 409.

## Floor Plan
JSON layout stored in `floor_plans.layout_data`. Each table has position {x, y, w, h, rotation}.
WebSocket broadcasts table state changes to all connected FOH devices within 3 seconds.
Channel: tenant.{tid}.branch.{bid}.tables

## Availability Algorithm
1. Get operating hours for requested date (special_operating_hours takes precedence over branch.operating_hours)
2. Find tables matching party_size (capacity_min ≤ party_size ≤ capacity_max)
3. Filter out tables with overlapping confirmed reservations in the time slot (reservation.duration_minutes default)
4. Filter out blocked tables
5. Return available tables with booking ETA

## Walk-in Profile Matching (500ms SLA)
1. Normalise phone to E.164
2. Look up customer_profiles by (tenant_id, phone)
3. If match: link visit, display name + tier + allergen_notes + no_show_count to host
4. If no match: create new profile with phone
5. If multiple matches: return all, host selects (flag for merge review)

## Reminders
24h reminder: queued job fired when reservation is created (scheduled for T-24h)
2h reminder: queued job fired when reservation is created (scheduled for T-2h)
Both via Twilio SMS. Respect customer communication_prefs.

## No-Show Logic
When status → no_show: increment customer_profiles.no_show_count
no_show_count >= threshold (configurable, default 2) → flag for deposit requirement on future bookings
Loyalty members get first no-show forgiveness (configurable per tier)

## Special Operating Hours
special_operating_hours table overrides branch.operating_hours for specific dates.
If is_closed = true: no availability returned for that date.
Analytics available seat-hour calculations must use special hours for affected dates.
