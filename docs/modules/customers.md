# Module: Customer Profiles & Loyalty
Full requirements: 65 numbered requirements (CP-01 through NF-CP-08).

## Profile Deduplication (Primary Key: Phone)
phone (E.164) is the primary dedup key. Email is secondary. Name+postcode is advisory only.
On any profile creation: check existing customer_profiles by (tenant_id, phone).
Match → link the new interaction to existing profile.
Multiple matches → flag both for manual merge review.
Manual merge: Owner/Manager initiated. Logged. Reversible within 30 days.
Merge result: all history, points, notes consolidated into primary. Secondary archived (status='anonymised').

## Loyalty Tier Thresholds (configurable)
Bronze: default (all enrolees)
Silver: $500 trailing 12-month spend OR 6 visits (whichever first)
Gold: $1500 trailing 12-month spend OR 15 visits

Recalculated: weekly batch job (Monday 03:00)
Immediate upgrade: when transaction pushes customer over threshold mid-week
Downgrade grace period: 30 days warning before downgrade takes effect

## Points Earn Rules
Standard: 1 point per $1 settled (not placed — settlement only)
Event bookings: 2× standard
Birthday month: 2× standard (if DOB on file)
Gold tier: 1.5× multiplier. Silver: 1.25×.
Atomic transactions: ALL points changes go through loyalty_transactions INSERT.
Never: UPDATE customer_profiles.loyalty_points directly. Always: INSERT loyalty_transaction → trigger recalculates balance.

## Points Redemption
Rate: 100 points = $1 discount
Minimum: 100 points. Maximum: bill value in points.
Not redeemable on: delivery platform orders, service charges, event deposits.
Partial redemption allowed (customer chooses amount in multiples of 100).
Expiry: 18 months inactivity (no earn or redeem). Warning sent at 12 months.

## GDPR Erasure Process
On confirmed erasure request:
1. Set status = 'deletion_pending'
2. After 14-day confirmation window: anonymise fields:
   - phone → 'ANONYMISED-{uuid}'
   - email → null
   - first_name, last_name → 'Anonymised'
   - date_of_birth → null
   - allergen_notes → null
3. Set status = 'anonymised'
4. loyalty_points → 0 (points forfeited)
5. Stop ALL outbound communications immediately
6. Financial history (loyalty_transactions, order references) RETAINED but profile no longer linkable to a person
