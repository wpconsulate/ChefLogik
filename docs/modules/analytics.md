# Module: Analytics & Reporting
Full requirements: 140 numbered requirements (AR-DA-01 through NF-AR-12).

## Architecture: Pre-Aggregation
Analytics NEVER queries live transaction tables. All data is pre-aggregated.
Aggregation jobs run on the 'analytics' queue (lowest priority, never blocks operations).

Aggregation schedule:
- Hourly: analytics_hourly_snapshots (live dashboard metrics — revenue today, waste today)
- Daily: analytics_daily_revenue, analytics_dish_performance (runs at 02:00 for previous day)
- Weekly: analytics_customer_segments (RFM recalculation, CLV update — Monday 03:00)
- Monthly: tier recalculation, period financial summary (1st of month 03:00)

## RFM Scoring
R (Recency): days since last visit → score 1-5 (5=within last week)
F (Frequency): total visits → score 1-5 (5=20+ visits)
M (Monetary): lifetime spend → score 1-5 (5=top quintile for tenant)

8 Segments:
Champion (R5, F4-5, M4-5) | Loyal | Potential loyalist | At risk | About to churn | New | Lost | High-value at risk

Stored in analytics_customer_segments. Updated weekly.

## Churn Risk
Expected visit interval: avg days between visits (calculated per customer)
Churn risk threshold: time since last visit > 2× expected interval → flag as churn risk
Churn risk score (0-100): combines recency, frequency trend, monetary trend
High-value at risk: top 20% CLV + churn risk → immediate manager alert

## Menu Engineering Matrix
Quadrants: Stars (high popularity + high margin) | Plowhorses (high pop + low margin) | Puzzles (low pop + high margin) | Dogs (low pop + low margin)
Popularity threshold: this item's order rate vs category average
Profitability threshold: this item's gross margin vs category average (NOT restaurant-wide — category-level)
Minimum 10 orders in period required for inclusion.
Recalculated weekly. Quadrant history tracked per dish.

## 5 Role-Appropriate Dashboards
owner_dashboard → analytics.owner_dashboard permission
branch_dashboard → analytics.branch_dashboard permission
kitchen_dashboard → analytics.kitchen_dashboard permission
events_dashboard → analytics.events_dashboard permission
customer_dashboard → analytics.customer_dashboard permission

## Key Calculated Metrics
RevPASH = revenue ÷ (seats × operating hours)
Food cost % = COGS ÷ food_revenue × 100 (target 28-35%)
Labour cost % = total_labour_cost ÷ revenue × 100 (target 25-35%)
CLV = avg_spend_per_visit × avg_visits_per_year × estimated_lifespan_years
COGS = opening_stock + purchases - closing_stock

## Tax Reporting
tax_category on every menu item (configurable: standard | zero_rated | reduced)
Tax collected report: net_sales, tax_rate, tax_amount per category per period
VAT/GST registration number in branch settings → printed on all invoices and tax reports

## Financial Period Close
Requires: completed stocktake for the branch in the period
Result: COGS finalised, period data locked (read-only)
Only Owner can reopen a closed period (logged with reason)
