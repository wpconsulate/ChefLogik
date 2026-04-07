# Module: Branch & Staff Management
Full requirements: 75 numbered requirements (BM-01 through NF-14).

## Branch Configuration
branches table: operating_hours (JSONB), settings (JSONB), timezone, currency
special_operating_hours: per-date overrides (closures, extended hours, private hire)
Branch settings: seat count, revenue targets, food cost target, waste threshold, commission rates per delivery platform

## Dynamic Roles System
See docs/05-auth-roles.md for full permission system specification.

Roles are per-tenant. System roles (is_system=true) are seeded and read-only.
Custom roles: Owner and Branch Manager can create (requires staff.manage_roles permission).
Custom roles: select from the predefined permission slug list in config/permissions.php.
Cannot delete a role with active user assignments.
Role change: permission cache invalidated immediately (Redis key deleted).

## Staff Lifecycle
Onboarding: create user record, assign role, assign branch_ids, upload documents
Documents: driving licence, food hygiene certificate, right-to-work
Document expiry: alert 30 days before expiry (analytics.branch_dashboard shows this)
Offboarding: status='suspended' → revoke all Sanctum tokens → status='inactive'

## Scheduling
Shifts: branch, date, start_time, end_time, role, assigned_user_id
Weekly schedule published by Branch Manager. Staff notified on publish.
Open shifts: visible to eligible staff (same role) who can claim them.
Scheduling conflicts: if staff member assigned to overlapping shifts → validation error.

## Attendance & Time Tracking
Clock-in/out: staff action at start/end of shift
Grace period: configurable (default 5 minutes). Late arrival flagged if beyond grace period.
Overtime: actual_end > scheduled_end by configurable threshold → flagged
Discrepancy alerts: clock-in without a scheduled shift, no clock-in for scheduled shift

## Payroll Export
Labour cost calculated as: (hours_worked × hourly_rate) per staff member per period.
Hourly rate stored in users.employment JSONB.
Export as CSV: staff_id, name, role, branch, scheduled_hours, actual_hours, overtime_hours, hourly_rate, gross_pay
Used by Analytics module for labour_cost % calculations.
