# Module: Orders & Deliveries
Full requirements: 92 numbered requirements (OD-01 through NF-OD-11). See the Orders_Deliveries_Requirements_v2.docx for complete specification. This file covers the key implementation details.

## 7 Order Channels
dine_in_pos | dine_in_qr | takeaway_counter | takeaway_phone | online | uber_eats | wolt

## 9 Lifecycle Stages
new → confirmed → preparing → ready → out_for_delivery → delivered → served → bill_settled → completed
(+ cancelled as terminal state from any non-final stage)

## Critical rules
- Stock deductions fire on transition to `confirmed` (OrderConfirmed event → DeductStockJob on 'critical' queue)
- Pre-paid online orders auto-confirmed immediately
- Delivery platform auto-confirmation within 5 minutes (configurable manual mode)
- Loyalty points issued on transition to `completed`
- All status transitions logged with actor + timestamp
- Refund engine centralised — never ad-hoc refunds in controllers

## Cancellation flows
Three triggers: customer-initiated | restaurant-initiated | delivery-failure
All feed the RefundEngine service which calculates amount and method (Stripe API | wallet credit | voucher | cash)
Cancellation before preparation: stock restored. After preparation started: stock NOT restored.

## Stripe payment flow
PaymentIntent created server-side → client_secret to frontend → Stripe.js handles card capture
Webhook (payment_intent.succeeded) confirms payment — polling NEVER used
All webhooks: signature verified → idempotency check (Redis 72h TTL) → dispatch job → return 200

## Delivery zones
Each branch configures zones with: geo_definition (radius/polygon/postcode), min_order_value, delivery_fee, transit_time_minutes
Checkout validates address via geocoding → zone check → enforces minimum
Zone pause: status='paused', does not delete configuration

## Peak hour throttle
Manual pause: calls Uber Eats Store Status API + Wolt Store Status API within 60 seconds (Decision 22: Wolt replaces DoorDash)
Auto-pause: configurable order count threshold triggers automatic pause + manager alert

## Key events to broadcast via Reverb
- OrderStatusChanged → channel: tenant.{tid}.branch.{bid}.orders
- NewOrderReceived → same channel
- OrderModified → same channel
