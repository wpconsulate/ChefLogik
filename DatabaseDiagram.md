# ChefLogik — Database Relationship Diagram

> Render interactively at [mermaid.live](https://mermaid.live) or view on GitHub (Mermaid is rendered natively).
> Columns shown are PKs, FKs, and key discriminator fields only. Full column specs in `docs/03-database-schema.md`.

```mermaid
erDiagram

    %% ─────────────────────────────────────────────
    %% PLATFORM-LEVEL (no tenant_id)
    %% ─────────────────────────────────────────────

    subscription_plans {
        uuid    id          PK
        varchar slug        UK
        varchar name
        int     max_branches
        decimal price_monthly
    }

    tenants {
        uuid    id          PK
        varchar slug        UK
        varchar name
        uuid    plan_id     FK
        enum    status
    }

    platform_admins {
        uuid    id          PK
        varchar email       UK
    }

    permissions {
        uuid    id          PK
        varchar slug        UK
        varchar module
        varchar label
    }

    customer_profiles {
        uuid    id          PK
        varchar phone       UK
        varchar email
        varchar first_name
        varchar last_name
        varchar password
        enum    status
    }

    audit_log {
        uuid      id            PK
        uuid      tenant_id     FK
        uuid      actor_id
        enum      actor_type
        varchar   action
        varchar   resource_type
        uuid      resource_id
        jsonb     changes
        timestamp created_at
    }

    %% ─────────────────────────────────────────────
    %% TENANT INFRASTRUCTURE
    %% ─────────────────────────────────────────────

    branches {
        uuid    id          PK
        uuid    tenant_id   FK
        varchar name
        jsonb   address
        varchar timezone
        varchar currency
        enum    status
    }

    special_operating_hours {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    branch_id   FK
        date    date
        boolean is_closed
    }

    %% ─────────────────────────────────────────────
    %% AUTH & ROLES
    %% ─────────────────────────────────────────────

    users {
        uuid    id          PK
        uuid    tenant_id   FK
        varchar name
        varchar email
        enum    status
    }

    roles {
        uuid    id          PK
        uuid    tenant_id   FK
        varchar slug
        varchar name
        boolean is_system
        uuid    created_by  FK
    }

    role_permissions {
        uuid    role_id       FK
        uuid    permission_id FK
    }

    user_roles {
        uuid    id          PK
        uuid    user_id     FK
        uuid    role_id     FK
        uuid    tenant_id   FK
        uuid    assigned_by FK
    }

    %% ─────────────────────────────────────────────
    %% STAFF SCHEDULING
    %% ─────────────────────────────────────────────

    shifts {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    branch_id   FK
        uuid    user_id     FK
        uuid    role_id     FK
        date    shift_date
        enum    status
    }

    attendance_records {
        uuid      id          PK
        uuid      tenant_id   FK
        uuid      branch_id   FK
        uuid      user_id     FK
        uuid      shift_id    FK
        timestamp clock_in_at
        timestamp clock_out_at
    }

    %% ─────────────────────────────────────────────
    %% MENU
    %% ─────────────────────────────────────────────

    menu_categories {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    parent_id   FK
        varchar name
        varchar slug
        boolean is_active
    }

    menu_items {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    category_id FK
        varchar sku         UK
        varchar name
        decimal base_price
        boolean is_active
        boolean is_master
        jsonb   allergens
    }

    menu_item_branch_overrides {
        uuid    id            PK
        uuid    tenant_id     FK
        uuid    menu_item_id  FK
        uuid    branch_id     FK
        decimal price_override
        boolean is_available
    }

    modifier_groups {
        uuid    id             PK
        uuid    tenant_id      FK
        varchar name
        enum    selection_type
        boolean is_required
    }

    modifiers {
        uuid    id             PK
        uuid    tenant_id      FK
        uuid    group_id       FK
        varchar name
        decimal price_addition
        boolean is_default
    }

    item_modifier_groups {
        uuid     menu_item_id      FK
        uuid     modifier_group_id FK
        smallint sort_order
    }

    eighty_six_log {
        uuid      id           PK
        uuid      tenant_id    FK
        uuid      branch_id    FK
        uuid      menu_item_id FK
        enum      trigger_type
        timestamp started_at
        timestamp ended_at
        uuid      restored_by  FK
    }

    %% ─────────────────────────────────────────────
    %% ORDERS
    %% ─────────────────────────────────────────────

    orders {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    branch_id           FK
        varchar order_ref           UK
        enum    source
        uuid    table_id            FK
        uuid    customer_profile_id FK
        uuid    delivery_zone_id    FK
        enum    status
        decimal subtotal
        decimal total
        enum    payment_status
        enum    payment_method
    }

    order_items {
        uuid     id           PK
        uuid     tenant_id    FK
        uuid     order_id     FK
        uuid     menu_item_id FK
        varchar  item_name
        varchar  item_sku
        smallint quantity
        decimal  unit_price
        decimal  line_total
        jsonb    modifiers
    }

    order_status_history {
        uuid      id          PK
        uuid      tenant_id   FK
        uuid      order_id    FK
        varchar   from_status
        varchar   to_status
        uuid      actor_id    FK
        enum      actor_type
        timestamp created_at
    }

    order_payments {
        uuid    id                        PK
        uuid    tenant_id                 FK
        uuid    order_id                  FK
        enum    method
        decimal amount
        varchar stripe_payment_intent_id
        enum    status
        decimal refund_amount
    }

    delivery_zones {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    branch_id   FK
        varchar name
        enum    geo_type
        jsonb   geo_definition
        decimal delivery_fee
        enum    status
    }

    promo_codes {
        uuid    id             PK
        uuid    tenant_id      FK
        varchar code           UK
        enum    discount_type
        decimal discount_value
        boolean is_active
    }

    disputes {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    order_id    FK
        varchar platform
        varchar reason_code
        decimal claimed_amount
    }

    %% ─────────────────────────────────────────────
    %% RESERVATIONS & TABLES
    %% ─────────────────────────────────────────────

    floor_plans {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    branch_id   FK
        varchar name
        jsonb   layout_data
        boolean is_active
    }

    tables {
        uuid     id            PK
        uuid     tenant_id     FK
        uuid     branch_id     FK
        uuid     floor_plan_id FK
        varchar  table_number
        smallint capacity_max
        enum     status
    }

    reservations {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    branch_id           FK
        uuid    table_id            FK
        uuid    customer_profile_id FK
        date    reservation_date
        time    reservation_time
        int     party_size
        enum    status
        varchar booking_channel
    }

    waitlist_entries {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    branch_id           FK
        uuid    customer_profile_id FK
        uuid    table_id            FK
        int     party_size
        enum    status
    }

    %% ─────────────────────────────────────────────
    %% EVENTS & FUNCTIONS
    %% ─────────────────────────────────────────────

    event_spaces {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    branch_id   FK
        varchar name
        int     capacity_max
        decimal hire_fee
    }

    event_packages {
        uuid    id              PK
        uuid    tenant_id       FK
        varchar name
        decimal price_per_head
        decimal minimum_spend
    }

    corporate_accounts {
        uuid    id                   PK
        uuid    tenant_id            FK
        varchar company_name
        decimal credit_limit
        uuid    coordinator_user_id  FK
        enum    status
    }

    events {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    branch_id           FK
        uuid    space_id            FK
        uuid    customer_profile_id FK
        uuid    package_id          FK
        uuid    corporate_account_id FK
        uuid    parent_event_id     FK
        date    event_date
        int     guest_count
        enum    status
    }

    %% ─────────────────────────────────────────────
    %% INVENTORY & KITCHEN
    %% ─────────────────────────────────────────────

    inventory_items {
        uuid    id               PK
        uuid    tenant_id        FK
        uuid    branch_id        FK
        varchar sku              UK
        varchar name
        varchar unit
        decimal current_stock
        decimal wac
        decimal par_level
        decimal reorder_point
        decimal critical_threshold
    }

    recipes {
        uuid    id           PK
        uuid    tenant_id    FK
        uuid    menu_item_id FK
        uuid    branch_id    FK
        enum    status
        uuid    approved_by  FK
    }

    recipe_ingredients {
        uuid    recipe_id         FK
        uuid    inventory_item_id FK
        decimal quantity
        decimal wastage_factor
    }

    stock_movements {
        uuid      id                PK
        uuid      tenant_id         FK
        uuid      branch_id         FK
        uuid      inventory_item_id FK
        enum      movement_type
        decimal   quantity
        decimal   unit_cost
        uuid      actor_id          FK
        timestamp created_at
    }

    suppliers {
        uuid    id          PK
        uuid    tenant_id   FK
        varchar name
        boolean is_active
    }

    purchase_orders {
        uuid    id          PK
        uuid    tenant_id   FK
        uuid    branch_id   FK
        uuid    supplier_id FK
        enum    status
        date    expected_delivery_date
        uuid    created_by  FK
    }

    purchase_order_items {
        uuid    id                PK
        uuid    po_id             FK
        uuid    inventory_item_id FK
        decimal quantity_ordered
        decimal unit_cost
    }

    goods_received_notes {
        uuid    id                PK
        uuid    tenant_id         FK
        uuid    branch_id         FK
        uuid    supplier_id       FK
        uuid    purchase_order_id FK
        enum    status
        uuid    received_by       FK
    }

    grn_items {
        uuid    grn_id            FK
        uuid    inventory_item_id FK
        decimal received_qty
        decimal unit_cost
    }

    waste_logs {
        uuid    id                PK
        uuid    tenant_id         FK
        uuid    branch_id         FK
        uuid    inventory_item_id FK
        decimal quantity
        enum    waste_type
        uuid    logged_by         FK
    }

    stocktakes {
        uuid    id            PK
        uuid    tenant_id     FK
        uuid    branch_id     FK
        enum    status
        uuid    conducted_by  FK
    }

    %% ─────────────────────────────────────────────
    %% CUSTOMER & LOYALTY
    %% ─────────────────────────────────────────────

    customer_tenant_profiles {
        uuid    id             PK
        uuid    customer_id    FK
        uuid    tenant_id      FK
        varchar loyalty_number UK
        enum    loyalty_tier
        int     loyalty_points
        decimal lifetime_spend
        int     lifetime_visits
        enum    status
    }

    loyalty_transactions {
        uuid    id               PK
        uuid    tenant_id        FK
        uuid    customer_id      FK
        enum    transaction_type
        int     points_delta
        int     balance_after
        uuid    actor_id         FK
    }

    loyalty_campaigns {
        uuid    id            PK
        uuid    tenant_id     FK
        varchar name
        enum    campaign_type
        enum    status
        uuid    created_by    FK
    }

    %% ─────────────────────────────────────────────
    %% ANALYTICS
    %% ─────────────────────────────────────────────

    analytics_daily_revenue {
        uuid    tenant_id   FK
        uuid    branch_id   FK
        date    date
        varchar channel
        decimal gross_revenue
        int     order_count
    }

    analytics_hourly_snapshots {
        uuid      tenant_id   FK
        uuid      branch_id   FK
        timestamp snapshot_at
        varchar   metric_key
        jsonb     metric_value
    }

    analytics_dish_performance {
        uuid    tenant_id          FK
        uuid    branch_id          FK
        uuid    menu_item_id       FK
        date    period_start
        int     units_sold
        enum    engineering_quadrant
    }

    analytics_customer_segments {
        uuid    tenant_id        FK
        uuid    customer_id      FK
        decimal clv_projected
        decimal churn_risk_score
        enum    rfm_segment
    }

    %% ═══════════════════════════════════════════════
    %% RELATIONSHIPS
    %% ═══════════════════════════════════════════════

    %% Platform core
    tenants                     }o--||  subscription_plans          : "subscribes to"

    %% Tenant → branches
    branches                    }o--||  tenants                     : "belongs to"
    special_operating_hours     }o--||  branches                    : "overrides hours for"

    %% Auth
    users                       }o--||  tenants                     : "belongs to"
    roles                       }o--||  tenants                     : "belongs to"
    roles                       }o--o|  users                       : "created by"
    role_permissions            }o--||  roles                       : "grants to"
    role_permissions            }o--||  permissions                 : "grants"
    user_roles                  }o--||  users                       : "assigns role to"
    user_roles                  }o--||  roles                       : "role assigned"

    %% Scheduling
    shifts                      }o--||  branches                    : "at"
    shifts                      }o--o|  users                       : "assigned to"
    shifts                      }o--||  roles                       : "for role"
    attendance_records          }o--||  users                       : "for"
    attendance_records          }o--||  branches                    : "at"
    attendance_records          }o--o|  shifts                      : "linked to"

    %% Menu
    menu_categories             }o--||  tenants                     : "belongs to"
    menu_categories             }o--o|  menu_categories             : "child of"
    menu_items                  }o--||  menu_categories             : "in"
    menu_item_branch_overrides  }o--||  menu_items                  : "overrides"
    menu_item_branch_overrides  }o--||  branches                    : "for branch"
    modifiers                   }o--||  modifier_groups             : "belongs to"
    item_modifier_groups        }o--||  menu_items                  : "links"
    item_modifier_groups        }o--||  modifier_groups             : "links"
    eighty_six_log              }o--||  menu_items                  : "for item"
    eighty_six_log              }o--||  branches                    : "at branch"
    eighty_six_log              }o--o|  users                       : "restored by"

    %% Orders
    orders                      }o--||  branches                    : "placed at"
    orders                      }o--o|  tables                      : "at table"
    orders                      }o--o|  customer_profiles           : "placed by"
    orders                      }o--o|  delivery_zones              : "in zone"
    order_items                 }o--||  orders                      : "belongs to"
    order_items                 }o--o|  menu_items                  : "references"
    order_status_history        }o--||  orders                      : "tracks"
    order_status_history        }o--o|  users                       : "actor"
    order_payments              }o--||  orders                      : "pays for"
    delivery_zones              }o--||  branches                    : "for branch"
    disputes                    }o--||  orders                      : "raised against"

    %% Reservations
    floor_plans                 }o--||  branches                    : "for branch"
    tables                      }o--||  branches                    : "in branch"
    tables                      }o--||  floor_plans                 : "on plan"
    reservations                }o--||  branches                    : "at branch"
    reservations                }o--o|  tables                      : "at table"
    reservations                }o--o|  customer_profiles           : "made by"
    waitlist_entries            }o--||  branches                    : "at branch"
    waitlist_entries            }o--o|  customer_profiles           : "for customer"
    waitlist_entries            }o--o|  tables                      : "seated at"

    %% Events
    event_spaces                }o--||  branches                    : "in branch"
    events                      }o--||  branches                    : "at branch"
    events                      }o--||  event_spaces                : "in space"
    events                      }o--o|  customer_profiles           : "organised by"
    events                      }o--o|  event_packages              : "uses package"
    events                      }o--o|  corporate_accounts          : "for account"
    events                      }o--o|  events                      : "recurrence of"
    corporate_accounts          }o--o|  users                       : "coordinated by"

    %% Inventory
    inventory_items             }o--||  branches                    : "stocked at"
    recipes                     }o--||  menu_items                  : "for item"
    recipes                     }o--o|  branches                    : "branch override"
    recipes                     }o--o|  users                       : "approved by"
    recipe_ingredients          }o--||  recipes                     : "in recipe"
    recipe_ingredients          }o--||  inventory_items             : "uses item"
    stock_movements             }o--||  inventory_items             : "tracks"
    stock_movements             }o--||  branches                    : "at branch"
    stock_movements             }o--o|  users                       : "by actor"
    suppliers                   }o--||  tenants                     : "belongs to"
    purchase_orders             }o--||  branches                    : "for branch"
    purchase_orders             }o--||  suppliers                   : "from supplier"
    purchase_orders             }o--o|  users                       : "created by"
    purchase_order_items        }o--||  purchase_orders             : "in PO"
    purchase_order_items        }o--||  inventory_items             : "orders item"
    goods_received_notes        }o--||  branches                    : "received at"
    goods_received_notes        }o--||  suppliers                   : "from supplier"
    goods_received_notes        }o--o|  purchase_orders             : "against PO"
    goods_received_notes        }o--o|  users                       : "received by"
    grn_items                   }o--||  goods_received_notes        : "in GRN"
    grn_items                   }o--||  inventory_items             : "delivers item"
    waste_logs                  }o--||  inventory_items             : "wastes item"
    waste_logs                  }o--||  branches                    : "at branch"
    waste_logs                  }o--o|  users                       : "logged by"
    stocktakes                  }o--||  branches                    : "at branch"
    stocktakes                  }o--o|  users                       : "conducted by"

    %% Customer & Loyalty
    customer_tenant_profiles    }o--||  customer_profiles           : "extends"
    customer_tenant_profiles    }o--||  tenants                     : "scoped to"
    loyalty_transactions        }o--||  customer_profiles           : "for customer"
    loyalty_transactions        }o--||  tenants                     : "scoped to"
    loyalty_transactions        }o--o|  users                       : "by actor"
    loyalty_campaigns           }o--||  tenants                     : "belongs to"
    loyalty_campaigns           }o--o|  users                       : "created by"

    %% Analytics
    analytics_daily_revenue        }o--||  branches        : "for branch"
    analytics_hourly_snapshots     }o--||  branches        : "for branch"
    analytics_dish_performance     }o--||  menu_items      : "for item"
    analytics_dish_performance     }o--||  branches        : "for branch"
    analytics_customer_segments    }o--||  customer_profiles : "for customer"

    %% Audit
    audit_log                   }o--o|  tenants                     : "scoped to"
```
