# Module: Events & Functions
Full requirements: 94 numbered requirements (EF-01 through NF-EF-10).

## 5-Phase Lifecycle
enquiry → proposal → confirmed → pre_event → day_of → completed (+ cancelled)
State machine enforced. Each transition has required fields and optional tasks.

## Enquiry Pipeline
Enquiry created with: occasion_type, event_date, guest_count, space preferences, organiser details.
Status: new → contacted → proposal_sent → (deposit_paid → confirmed) | lost
Lost enquiry requires reason: price | date_unavailable | competitor | no_response | other

## Deposit Collection
Deposit amount configured per event space. Collected via Stripe PaymentIntent.
Non-refundable booking fee retained on cancellation (configurable policy per occasion type).
Corporate accounts with net-30: no deposit required if within credit limit.

## Corporate Accounts
corporate_accounts table: company, billing contact, credit_limit, coordinator, status
Multiple event organisers (users) linked to one corporate account.
New bookings for net-30 accounts: check credit_limit against outstanding invoice total.
If new booking would exceed limit: requires Owner authorisation.

## Recurring Events
parent_event (with recurrence_rule JSONB) → child event records per occurrence.
Each child has its own date, guest_count, pre-event tasks, and billing.
Cancelling an individual child does not affect the recurrence schedule.
Cancelling the parent cancels all future (confirmed but not yet completed) children.

## Run Sheet
Auto-generated from event details: timeline, menu, dietary requirements, staff assignments, notes.
Pushed to Host via push notification on day_of transition.
Stored as JSONB on events.run_sheet, exportable as PDF.

## Minimum Spend Tracking
events.actual_spend updated in real time as orders are added during service.
If actual_spend < minimum_spend at bill close: manager prompted to add minimum spend charge.
Minimum spend compliance tracked in analytics.

## Pre-event Planning Tasks
Tasks created on booking confirmation (auto-generated based on occasion type).
Assigned to staff members. Due dates relative to event date.
Overdue tasks trigger manager alert via Reverb + push notification.
