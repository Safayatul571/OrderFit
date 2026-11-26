use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
struct OrderReportSummary {
    total_orders: i64,
    active_orders: i64,
    completed_orders: i64,
    at_risk_orders: i64,
    average_progress: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProductionStageSummary {
    stage: String,
    record_count: i64,
    completed_quantity: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct InventoryReportSummary {
    total_materials: i64,
    low_stock_materials: i64,
    out_of_stock_materials: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProcurementReportSummary {
    total_purchase_orders: i64,
    open_purchase_orders: i64,
    received_purchase_orders: i64,
    ordered_value: f64,
    outstanding_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct MachineReportSummary {
    total_machines: i64,
    active_machines: i64,
    idle_machines: i64,
    maintenance_machines: i64,
    inactive_machines: i64,
    total_maintenance_cost: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ReportsSummary {
    orders: OrderReportSummary,
    production_by_stage: Vec<ProductionStageSummary>,
    inventory: InventoryReportSummary,
    procurement: ProcurementReportSummary,
    machines: MachineReportSummary,
}
#[derive(Debug, Serialize, Deserialize)]
struct FactoryHealthReport {
    generated_at: String,
    overall_status: String,
    summary: ReportsSummary,
    overdue_order_count: i64,
    delayed_schedule_count: i64,
    late_purchase_order_count: i64,
    machine_attention_count: i64,
    order_issues: Vec<ReportOrderIssue>,
    production_schedules: Vec<ReportScheduleIssue>,
    material_issues: Vec<ReportMaterialIssue>,
    late_purchase_orders: Vec<ReportPurchaseOrderIssue>,
    machine_issues: Vec<ReportMachineIssue>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ReportOrderIssue {
    id: String,
    buyer: String,
    product: String,
    quantity: String,
    due: String,
    progress: i32,
    status: String,
    is_overdue: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct ReportScheduleIssue {
    id: String,
    order_id: String,
    buyer: String,
    product: String,
    stage: String,
    planned_quantity: i64,
    actual_quantity: i64,
    target_date: String,
    status: String,
    behind_plan: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct ReportMaterialIssue {
    id: String,
    sku: String,
    name: String,
    category: String,
    unit: String,
    current_stock: f64,
    minimum_stock: f64,
    is_out_of_stock: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct ReportPurchaseOrderIssue {
    id: String,
    po_number: String,
    supplier_name: String,
    expected_delivery_date: String,
    status: String,
    outstanding_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ReportMachineIssue {
    id: String,
    machine_code: String,
    name: String,
    department: String,
    status: String,
    next_maintenance_date: String,
    attention_reason: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct Order {
    id: String,
    buyer: String,
    product: String,
    quantity: String,
    due: String,
    progress: i32,
    status: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProductionEntry {
    id: String,
    order_id: String,
    stage: String,
    completed_quantity: i64,
    production_date: String,
    notes: String,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProductionSchedule {
    id: String,
    order_id: String,
    buyer: String,
    product: String,
    order_quantity: String,
    stage: String,
    planned_quantity: i64,
    actual_quantity: i64,
    start_date: String,
    target_date: String,
    status: String,
    notes: String,
    created_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct Material {
    id: String,
    sku: String,
    name: String,
    category: String,
    unit: String,
    minimum_stock: f64,
    current_stock: f64,
    notes: String,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Machine {
    id: String,
    machine_code: String,
    name: String,
    machine_type: String,
    brand: String,
    model: String,
    department: String,
    location: String,
    capacity_per_hour: f64,
    capacity_unit: String,
    status: String,
    purchase_date: String,
    last_maintenance_date: String,
    next_maintenance_date: String,
    notes: String,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct MachineMaintenance {
    id: String,
    machine_id: String,
    machine_code: String,
    machine_name: String,
    service_date: String,
    maintenance_type: String,
    description: String,
    cost: f64,
    next_service_date: String,
    performed_by: String,
    notes: String,
    created_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct Worker {
    id: String,
    employee_code: String,
    name: String,
    phone: String,
    address: String,
    designation: String,
    department: String,
    skills: String,
    joining_date: String,
    status: String,
    notes: String,
    created_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct Supplier {
    id: String,
    name: String,
    contact_person: String,
    phone: String,
    email: String,
    address: String,
    notes: String,
    created_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct Buyer {
    id: String,
    name: String,
    contact_person: String,
    email: String,
    phone: String,
    country: String,
    address: String,
    notes: String,
    created_at: String,
}

// Inventory transaction history entry.
#[derive(Debug, Serialize, Deserialize)]
struct InventoryTransaction {
    id: String,
    material_id: String,
    material_name: String,
    sku: String,
    transaction_type: String,
    quantity_change: f64,
    transaction_date: String,
    reference: String,
    notes: String,
    created_at: String,
}
#[derive(Debug, Serialize, Deserialize)]
struct PurchaseOrder {
    id: String,
    po_number: String,
    supplier_id: String,
    supplier_name: String,
    order_date: String,
    expected_delivery_date: String,
    status: String,
    notes: String,
    total_amount: f64,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PurchaseOrderItem {
    id: String,
    purchase_order_id: String,
    material_id: String,
    material_name: String,
    sku: String,
    unit: String,
    ordered_quantity: f64,
    received_quantity: f64,
    unit_price: f64,
    subtotal: f64,
}

#[derive(Debug, Deserialize)]
struct PurchaseOrderItemInput {
    material_id: String,
    ordered_quantity: f64,
    unit_price: f64,
}
#[derive(Debug, Serialize, Deserialize)]
struct PurchaseOrderReceipt {
    id: String,
    purchase_order_item_id: String,
    material_id: String,
    material_name: String,
    quantity_received: f64,
    receipt_date: String,
    inventory_transaction_id: String,
    notes: String,
    created_at: String,
}
const PRODUCTION_STAGES: [&str; 4] = ["Cutting", "Sewing", "Finishing", "QC"];

fn database_connection(app: &AppHandle) -> Result<Connection, String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?;

    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;

    let database_path = directory.join("orderfit.db");

    let connection = Connection::open(database_path).map_err(|e| e.to_string())?;

    // Enable foreign keys for every database connection.
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;

    Ok(connection)
}

fn initialize_database(app: &AppHandle) -> Result<(), String> {
    let connection = database_connection(app)?;

    connection
        .execute(
            "CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                buyer TEXT NOT NULL,
                product TEXT NOT NULL,
                quantity TEXT NOT NULL,
                due TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'On Track'
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS production_entries (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                stage TEXT NOT NULL
                    CHECK(stage IN ('Cutting', 'Sewing', 'Finishing', 'QC')),
                completed_quantity INTEGER NOT NULL
                    CHECK(completed_quantity > 0),
                production_date TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(order_id)
                    REFERENCES orders(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS
                idx_production_entries_order_stage
            ON production_entries(order_id, stage);

            CREATE INDEX IF NOT EXISTS
                idx_production_entries_date
            ON production_entries(production_date);",
        )
        .map_err(|e| e.to_string())?;

    // Inventory materials and stock transaction history.
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS materials (
                id TEXT PRIMARY KEY,
                sku TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                unit TEXT NOT NULL,
                minimum_stock REAL NOT NULL DEFAULT 0
                    CHECK(minimum_stock >= 0),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS inventory_transactions (
                id TEXT PRIMARY KEY,
                material_id TEXT NOT NULL,
                transaction_type TEXT NOT NULL
                    CHECK(transaction_type IN (
                        'Stock In',
                        'Stock Out',
                        'Adjustment'
                    )),
                quantity_change REAL NOT NULL
                    CHECK(quantity_change != 0),
                transaction_date TEXT NOT NULL,
                reference TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(material_id)
                    REFERENCES materials(id)
                    ON DELETE RESTRICT
            );

            CREATE INDEX IF NOT EXISTS
                idx_inventory_transactions_material
            ON inventory_transactions(material_id);

            CREATE INDEX IF NOT EXISTS
                idx_inventory_transactions_date
            ON inventory_transactions(transaction_date);",
        )
        .map_err(|e| e.to_string())?;

    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                contact_person TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS
                idx_suppliers_name
            ON suppliers(name);",
        )
        .map_err(|e| e.to_string())?;

    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS buyers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                contact_person TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                country TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_buyers_name
                ON buyers(name);",
        )
        .map_err(|e| e.to_string())?;

    // Preserve existing order buyer names during migration.
    connection
        .execute(
            "INSERT OR IGNORE INTO buyers (id, name)
             SELECT
                'BUY-MIG-' || lower(hex(randomblob(8))),
                TRIM(buyer)
             FROM orders
             WHERE TRIM(buyer) <> ''
             GROUP BY TRIM(buyer) COLLATE NOCASE",
            [],
        )
        .map_err(|e| e.to_string())?;
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS workers (
                id TEXT PRIMARY KEY,
                employee_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
                name TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                designation TEXT NOT NULL DEFAULT '',
                department TEXT NOT NULL DEFAULT '',
                skills TEXT NOT NULL DEFAULT '',
                joining_date TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'Active'
                    CHECK(status IN ('Active', 'Inactive', 'On Leave')),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_workers_name
                ON workers(name);

            CREATE INDEX IF NOT EXISTS idx_workers_status
                ON workers(status);

            CREATE INDEX IF NOT EXISTS idx_workers_department
                ON workers(department);",
        )
        .map_err(|e| e.to_string())?;
    // Machine registry and maintenance history.
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS machines (
                id TEXT PRIMARY KEY,
                machine_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
                name TEXT NOT NULL,
                machine_type TEXT NOT NULL,
                brand TEXT NOT NULL DEFAULT '',
                model TEXT NOT NULL DEFAULT '',
                department TEXT NOT NULL DEFAULT '',
                location TEXT NOT NULL DEFAULT '',
                capacity_per_hour REAL NOT NULL DEFAULT 0
                    CHECK(capacity_per_hour >= 0),
                capacity_unit TEXT NOT NULL DEFAULT 'pcs',
                status TEXT NOT NULL DEFAULT 'Active'
                    CHECK(status IN ('Active', 'Idle', 'Maintenance', 'Inactive')),
                purchase_date TEXT NOT NULL DEFAULT '',
                last_maintenance_date TEXT NOT NULL DEFAULT '',
                next_maintenance_date TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_machines_name
                ON machines(name);

            CREATE INDEX IF NOT EXISTS idx_machines_status
                ON machines(status);

            CREATE INDEX IF NOT EXISTS idx_machines_department
                ON machines(department);

            CREATE TABLE IF NOT EXISTS machine_maintenance (
                id TEXT PRIMARY KEY,
                machine_id TEXT NOT NULL,
                service_date TEXT NOT NULL,
                maintenance_type TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                cost REAL NOT NULL DEFAULT 0 CHECK(cost >= 0),
                next_service_date TEXT NOT NULL DEFAULT '',
                performed_by TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(machine_id)
                    REFERENCES machines(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_machine_maintenance_machine
                ON machine_maintenance(machine_id);

            CREATE INDEX IF NOT EXISTS idx_machine_maintenance_date
                ON machine_maintenance(service_date);",
        )
        .map_err(|e| e.to_string())?;
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS purchase_orders (
                id TEXT PRIMARY KEY,
                po_number TEXT NOT NULL UNIQUE,
                supplier_id TEXT NOT NULL,
                order_date TEXT NOT NULL,
                expected_delivery_date TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'Draft'
                    CHECK(status IN (
                        'Draft',
                        'Pending',
                        'Ordered',
                        'Partially Received',
                        'Received',
                        'Cancelled'
                    )),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(supplier_id)
                    REFERENCES suppliers(id)
                    ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id TEXT PRIMARY KEY,
                purchase_order_id TEXT NOT NULL,
                material_id TEXT NOT NULL,
                ordered_quantity REAL NOT NULL
                    CHECK(ordered_quantity > 0),
                received_quantity REAL NOT NULL DEFAULT 0
                    CHECK(received_quantity >= 0
                        AND received_quantity <= ordered_quantity),
                unit_price REAL NOT NULL
                    CHECK(unit_price >= 0),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(purchase_order_id)
                    REFERENCES purchase_orders(id)
                    ON DELETE CASCADE,
                FOREIGN KEY(material_id)
                    REFERENCES materials(id)
                    ON DELETE RESTRICT,
                UNIQUE(purchase_order_id, material_id)
            );

            CREATE TABLE IF NOT EXISTS purchase_order_receipts (
                id TEXT PRIMARY KEY,
                purchase_order_item_id TEXT NOT NULL,
                quantity_received REAL NOT NULL
                    CHECK(quantity_received > 0),
                receipt_date TEXT NOT NULL,
                inventory_transaction_id TEXT NOT NULL UNIQUE,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(purchase_order_item_id)
                    REFERENCES purchase_order_items(id)
                    ON DELETE RESTRICT,
                FOREIGN KEY(inventory_transaction_id)
                    REFERENCES inventory_transactions(id)
                    ON DELETE RESTRICT
            );

            CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier
                ON purchase_orders(supplier_id);

            CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
                ON purchase_orders(status);

            CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order
                ON purchase_order_items(purchase_order_id);

            CREATE INDEX IF NOT EXISTS idx_purchase_order_receipts_item
                ON purchase_order_receipts(purchase_order_item_id);",
        )
        .map_err(|e| e.to_string())?;
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS production_schedules (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                stage TEXT NOT NULL
                    CHECK(stage IN ('Cutting', 'Sewing', 'Finishing', 'QC')),
                planned_quantity INTEGER NOT NULL CHECK(planned_quantity > 0),
                start_date TEXT NOT NULL,
                target_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Planned'
                    CHECK(status IN ('Planned', 'In Progress', 'Completed', 'Delayed')),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
                UNIQUE(order_id, stage)
            );

            CREATE INDEX IF NOT EXISTS idx_production_schedules_order
                ON production_schedules(order_id);
            CREATE INDEX IF NOT EXISTS idx_production_schedules_dates
                ON production_schedules(start_date, target_date);
            CREATE INDEX IF NOT EXISTS idx_production_schedules_status
                ON production_schedules(status);",
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

// Extract the numeric part from quantities such as "500 pcs".
fn parse_order_quantity(quantity: &str) -> Result<i64, String> {
    let digits: String = quantity
        .trim()
        .chars()
        .take_while(|character| character.is_ascii_digit())
        .collect();

    let value = digits
        .parse::<i64>()
        .map_err(|_| "Order quantity must start with a valid whole number.".to_string())?;

    if value <= 0 {
        return Err("Order quantity must be greater than zero.".into());
    }

    Ok(value)
}

fn validate_production_stage(stage: &str) -> Result<(), String> {
    if !PRODUCTION_STAGES.contains(&stage) {
        return Err("Invalid stage. Use Cutting, Sewing, Finishing or QC.".into());
    }

    Ok(())
}

fn validate_production_quantity(
    connection: &Connection,
    order_id: &str,
    stage: &str,
    completed_quantity: i64,
    excluded_entry_id: Option<&str>,
) -> Result<(), String> {
    if completed_quantity <= 0 {
        return Err("Completed quantity must be greater than zero.".into());
    }

    let order_quantity: String = connection
        .query_row(
            "SELECT quantity FROM orders WHERE id = ?1",
            params![order_id],
            |row| row.get(0),
        )
        .map_err(|_| "Order not found.".to_string())?;

    let target_quantity = parse_order_quantity(&order_quantity)?;

    let existing_quantity: i64 = if let Some(entry_id) = excluded_entry_id {
        connection
            .query_row(
                "SELECT COALESCE(SUM(completed_quantity), 0)
                 FROM production_entries
                 WHERE order_id = ?1 AND stage = ?2 AND id != ?3",
                params![order_id, stage, entry_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?
    } else {
        connection
            .query_row(
                "SELECT COALESCE(SUM(completed_quantity), 0)
                 FROM production_entries
                 WHERE order_id = ?1 AND stage = ?2",
                params![order_id, stage],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?
    };

    if existing_quantity + completed_quantity > target_quantity {
        return Err(format!(
            "Production quantity exceeds the order quantity of {} pcs for {}.",
            target_quantity, stage
        ));
    }

    Ok(())
}

#[tauri::command]
fn get_reports_summary(app: AppHandle) -> Result<ReportsSummary, String> {
    let connection = database_connection(&app)?;

    let orders = connection
        .query_row(
            "SELECT
                COUNT(*),
                COALESCE(SUM(CASE WHEN status <> 'Completed' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN status = 'At Risk' THEN 1 ELSE 0 END), 0),
                COALESCE(AVG(progress), 0)
             FROM orders",
            [],
            |row| {
                Ok(OrderReportSummary {
                    total_orders: row.get(0)?,
                    active_orders: row.get(1)?,
                    completed_orders: row.get(2)?,
                    at_risk_orders: row.get(3)?,
                    average_progress: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let production_by_stage = {
        let mut statement = connection
            .prepare(
                "SELECT
                    stages.stage,
                    COUNT(p.id),
                    COALESCE(SUM(p.completed_quantity), 0)
                 FROM (
                    SELECT 'Cutting' AS stage
                    UNION ALL SELECT 'Sewing'
                    UNION ALL SELECT 'Finishing'
                    UNION ALL SELECT 'QC'
                 ) stages
                 LEFT JOIN production_entries p
                    ON p.stage = stages.stage
                 GROUP BY stages.stage
                 ORDER BY CASE stages.stage
                    WHEN 'Cutting' THEN 1
                    WHEN 'Sewing' THEN 2
                    WHEN 'Finishing' THEN 3
                    WHEN 'QC' THEN 4
                 END",
            )
            .map_err(|e| e.to_string())?;

        let rows = statement
            .query_map([], |row| {
                Ok(ProductionStageSummary {
                    stage: row.get(0)?,
                    record_count: row.get(1)?,
                    completed_quantity: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut result = Vec::new();

        for row in rows {
            result.push(row.map_err(|e| e.to_string())?);
        }

        result
    };

    let inventory = connection
        .query_row(
            "SELECT
                COUNT(*),
                COALESCE(SUM(
                    CASE WHEN stock <= minimum_stock THEN 1 ELSE 0 END
                ), 0),
                COALESCE(SUM(
                    CASE WHEN stock <= 0 THEN 1 ELSE 0 END
                ), 0)
             FROM (
                SELECT
                    m.id,
                    m.minimum_stock,
                    COALESCE(SUM(t.quantity_change), 0) AS stock
                FROM materials m
                LEFT JOIN inventory_transactions t
                    ON t.material_id = m.id
                GROUP BY m.id
             ) material_stock",
            [],
            |row| {
                Ok(InventoryReportSummary {
                    total_materials: row.get(0)?,
                    low_stock_materials: row.get(1)?,
                    out_of_stock_materials: row.get(2)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let procurement = connection
        .query_row(
            "SELECT
                COUNT(DISTINCT p.id),
                COUNT(DISTINCT CASE WHEN p.status IN (
                    'Draft', 'Pending', 'Ordered', 'Partially Received'
                ) THEN p.id END),
                COUNT(DISTINCT CASE WHEN p.status = 'Received' THEN p.id END),
                COALESCE(SUM(
                    CASE WHEN p.status <> 'Cancelled'
                        THEN i.ordered_quantity * i.unit_price
                        ELSE 0
                    END
                ), 0),
                COALESCE(SUM(
                    CASE WHEN p.status <> 'Cancelled'
                        THEN (i.ordered_quantity - i.received_quantity) * i.unit_price
                        ELSE 0
                    END
                ), 0)
             FROM purchase_orders p
             LEFT JOIN purchase_order_items i
                ON i.purchase_order_id = p.id",
            [],
            |row| {
                Ok(ProcurementReportSummary {
                    total_purchase_orders: row.get(0)?,
                    open_purchase_orders: row.get(1)?,
                    received_purchase_orders: row.get(2)?,
                    ordered_value: row.get(3)?,
                    outstanding_value: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let machines = connection
        .query_row(
            "SELECT
                COUNT(*),
                COALESCE(SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN status = 'Idle' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END), 0),
                COALESCE((
                    SELECT SUM(cost) FROM machine_maintenance
                ), 0)
             FROM machines",
            [],
            |row| {
                Ok(MachineReportSummary {
                    total_machines: row.get(0)?,
                    active_machines: row.get(1)?,
                    idle_machines: row.get(2)?,
                    maintenance_machines: row.get(3)?,
                    inactive_machines: row.get(4)?,
                    total_maintenance_cost: row.get(5)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(ReportsSummary {
        orders,
        production_by_stage,
        inventory,
        procurement,
        machines,
    })
}
#[tauri::command]
fn get_factory_health_report(app: AppHandle) -> Result<FactoryHealthReport, String> {
    let connection = database_connection(&app)?;
    let summary = get_reports_summary(app.clone())?;

    let generated_at: String = connection
        .query_row(
            "SELECT datetime('now', 'localtime')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let order_issues = {
        let mut statement = connection
            .prepare(
                "SELECT
                    id, buyer, product, quantity, due, progress, status,
                    CASE
                        WHEN due <> '' AND date(due) < date('now', 'localtime')
                        THEN 1 ELSE 0
                    END
                 FROM orders
                 WHERE status <> 'Completed'
                   AND (
                        status = 'At Risk'
                        OR (
                            due <> ''
                            AND date(due) < date('now', 'localtime')
                        )
                   )
                 ORDER BY
                    CASE WHEN due <> '' AND date(due) < date('now', 'localtime')
                        THEN 0 ELSE 1 END,
                    due ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = statement
            .query_map([], |row| {
                Ok(ReportOrderIssue {
                    id: row.get(0)?,
                    buyer: row.get(1)?,
                    product: row.get(2)?,
                    quantity: row.get(3)?,
                    due: row.get(4)?,
                    progress: row.get(5)?,
                    status: row.get(6)?,
                    is_overdue: row.get::<_, i64>(7)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for row in rows {
            items.push(row.map_err(|e| e.to_string())?);
        }
        items
    };

    let production_schedules = {
        let mut statement = connection
            .prepare(
                "SELECT
                    s.id,
                    s.order_id,
                    o.buyer,
                    o.product,
                    s.stage,
                    s.planned_quantity,
                    COALESCE(SUM(p.completed_quantity), 0),
                    s.target_date,
                    s.status,
                    CASE
                        WHEN s.status = 'Delayed' THEN 1
                        WHEN date(s.target_date) < date('now', 'localtime')
                             AND COALESCE(SUM(p.completed_quantity), 0)
                                 < s.planned_quantity
                        THEN 1
                        ELSE 0
                    END
                 FROM production_schedules s
                 JOIN orders o ON o.id = s.order_id
                 LEFT JOIN production_entries p
                    ON p.order_id = s.order_id
                    AND p.stage = s.stage
                 GROUP BY s.id
                 HAVING s.status <> 'Completed'
                    OR COALESCE(SUM(p.completed_quantity), 0)
                        < s.planned_quantity
                 ORDER BY
                    CASE WHEN s.status = 'Delayed' THEN 0 ELSE 1 END,
                    s.target_date ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = statement
            .query_map([], |row| {
                Ok(ReportScheduleIssue {
                    id: row.get(0)?,
                    order_id: row.get(1)?,
                    buyer: row.get(2)?,
                    product: row.get(3)?,
                    stage: row.get(4)?,
                    planned_quantity: row.get(5)?,
                    actual_quantity: row.get(6)?,
                    target_date: row.get(7)?,
                    status: row.get(8)?,
                    behind_plan: row.get::<_, i64>(9)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for row in rows {
            items.push(row.map_err(|e| e.to_string())?);
        }
        items
    };

    let material_issues = {
        let mut statement = connection
            .prepare(
                "SELECT
                    m.id,
                    m.sku,
                    m.name,
                    m.category,
                    m.unit,
                    COALESCE(SUM(t.quantity_change), 0),
                    m.minimum_stock,
                    CASE
                        WHEN COALESCE(SUM(t.quantity_change), 0) <= 0
                        THEN 1 ELSE 0
                    END
                 FROM materials m
                 LEFT JOIN inventory_transactions t
                    ON t.material_id = m.id
                 GROUP BY m.id
                 HAVING COALESCE(SUM(t.quantity_change), 0)
                    <= m.minimum_stock
                 ORDER BY
                    CASE WHEN COALESCE(SUM(t.quantity_change), 0) <= 0
                        THEN 0 ELSE 1 END,
                    m.name ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = statement
            .query_map([], |row| {
                Ok(ReportMaterialIssue {
                    id: row.get(0)?,
                    sku: row.get(1)?,
                    name: row.get(2)?,
                    category: row.get(3)?,
                    unit: row.get(4)?,
                    current_stock: row.get(5)?,
                    minimum_stock: row.get(6)?,
                    is_out_of_stock: row.get::<_, i64>(7)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for row in rows {
            items.push(row.map_err(|e| e.to_string())?);
        }
        items
    };

    let late_purchase_orders = {
        let mut statement = connection
            .prepare(
                "SELECT
                    p.id,
                    p.po_number,
                    s.name,
                    p.expected_delivery_date,
                    p.status,
                    COALESCE(SUM(
                        (i.ordered_quantity - i.received_quantity) * i.unit_price
                    ), 0)
                 FROM purchase_orders p
                 JOIN suppliers s ON s.id = p.supplier_id
                 LEFT JOIN purchase_order_items i
                    ON i.purchase_order_id = p.id
                 WHERE p.status IN ('Pending', 'Ordered', 'Partially Received')
                   AND p.expected_delivery_date <> ''
                   AND date(p.expected_delivery_date) < date('now', 'localtime')
                 GROUP BY p.id
                 ORDER BY p.expected_delivery_date ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = statement
            .query_map([], |row| {
                Ok(ReportPurchaseOrderIssue {
                    id: row.get(0)?,
                    po_number: row.get(1)?,
                    supplier_name: row.get(2)?,
                    expected_delivery_date: row.get(3)?,
                    status: row.get(4)?,
                    outstanding_value: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for row in rows {
            items.push(row.map_err(|e| e.to_string())?);
        }
        items
    };

    let machine_issues = {
        let mut statement = connection
            .prepare(
                "SELECT
                    id,
                    machine_code,
                    name,
                    department,
                    status,
                    next_maintenance_date,
                    CASE
                        WHEN status = 'Maintenance' THEN 'Currently under maintenance'
                        WHEN status = 'Inactive' THEN 'Machine is inactive'
                        ELSE 'Maintenance date is due'
                    END
                 FROM machines
                 WHERE status IN ('Maintenance', 'Inactive')
                    OR (
                        next_maintenance_date <> ''
                        AND date(next_maintenance_date) <= date('now', 'localtime')
                    )
                 ORDER BY
                    CASE
                        WHEN status = 'Inactive' THEN 0
                        WHEN status = 'Maintenance' THEN 1
                        ELSE 2
                    END,
                    name ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = statement
            .query_map([], |row| {
                Ok(ReportMachineIssue {
                    id: row.get(0)?,
                    machine_code: row.get(1)?,
                    name: row.get(2)?,
                    department: row.get(3)?,
                    status: row.get(4)?,
                    next_maintenance_date: row.get(5)?,
                    attention_reason: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut items = Vec::new();
        for row in rows {
            items.push(row.map_err(|e| e.to_string())?);
        }
        items
    };

    let overdue_order_count = order_issues
        .iter()
        .filter(|item| item.is_overdue)
        .count() as i64;

    let delayed_schedule_count = production_schedules
        .iter()
        .filter(|item| item.behind_plan)
        .count() as i64;

    let late_purchase_order_count = late_purchase_orders.len() as i64;
    let machine_attention_count = machine_issues.len() as i64;

    let critical_issues =
        overdue_order_count
        + late_purchase_order_count
        + summary.inventory.out_of_stock_materials;

    let attention_issues =
        summary.orders.at_risk_orders
        + delayed_schedule_count
        + summary.inventory.low_stock_materials
        + machine_attention_count;

    let overall_status = if critical_issues > 0 {
        "Critical"
    } else if attention_issues > 0 {
        "Needs Attention"
    } else {
        "Good"
    };

    Ok(FactoryHealthReport {
        generated_at,
        overall_status: overall_status.to_string(),
        summary,
        overdue_order_count,
        delayed_schedule_count,
        late_purchase_order_count,
        machine_attention_count,
        order_issues,
        production_schedules,
        material_issues,
        late_purchase_orders,
        machine_issues,
    })
}
#[tauri::command]
fn list_orders(app: AppHandle) -> Result<Vec<Order>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT id, buyer, product, quantity, due, progress, status
             FROM orders ORDER BY rowid DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Order {
                id: row.get(0)?,
                buyer: row.get(1)?,
                product: row.get(2)?,
                quantity: row.get(3)?,
                due: row.get(4)?,
                progress: row.get(5)?,
                status: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut orders = Vec::new();

    for order in rows {
        orders.push(order.map_err(|e| e.to_string())?);
    }

    Ok(orders)
}

#[tauri::command]
fn create_order(
    app: AppHandle,
    buyer: String,
    product: String,
    quantity: String,
    due: String,
) -> Result<Order, String> {
    if buyer.trim().is_empty() || product.trim().is_empty() || quantity.trim().is_empty() {
        return Err("Buyer, product and quantity are required.".into());
    }

    let mut connection = database_connection(&app)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let id = format!("ORD-{timestamp}");
    let buyer_id = format!("BUY-{timestamp}");

    let order = Order {
        id,
        buyer: buyer.trim().to_string(),
        product: product.trim().to_string(),
        quantity: quantity.trim().to_string(),
        due: due.trim().to_string(),
        progress: 0,
        status: "On Track".to_string(),
    };

    let transaction = connection.transaction().map_err(|e| e.to_string())?;

    transaction
        .execute(
            "INSERT OR IGNORE INTO buyers (id, name)
             VALUES (?1, ?2)",
            params![buyer_id, order.buyer],
        )
        .map_err(|e| e.to_string())?;

    transaction
        .execute(
            "INSERT INTO orders
             (id, buyer, product, quantity, due, progress, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                order.id,
                order.buyer,
                order.product,
                order.quantity,
                order.due,
                order.progress,
                order.status
            ],
        )
        .map_err(|e| e.to_string())?;

    transaction.commit().map_err(|e| e.to_string())?;

    Ok(order)
}

#[tauri::command]
fn update_order(
    app: AppHandle,
    id: String,
    buyer: String,
    product: String,
    quantity: String,
    due: String,
    progress: i32,
    status: String,
) -> Result<(), String> {
    if buyer.trim().is_empty() || product.trim().is_empty() || quantity.trim().is_empty() {
        return Err("Buyer, product and quantity are required.".into());
    }

    if !(0..=100).contains(&progress) {
        return Err("Progress must be between 0 and 100.".into());
    }

    if !["On Track", "At Risk", "Completed"].contains(&status.as_str()) {
        return Err("Invalid order status.".into());
    }

    let mut connection = database_connection(&app)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let buyer_id = format!("BUY-{timestamp}");

    let transaction = connection.transaction().map_err(|e| e.to_string())?;

    transaction
        .execute(
            "INSERT OR IGNORE INTO buyers (id, name)
             VALUES (?1, ?2)",
            params![buyer_id, buyer.trim()],
        )
        .map_err(|e| e.to_string())?;

    let changed = transaction
        .execute(
            "UPDATE orders
             SET buyer = ?1, product = ?2, quantity = ?3,
                 due = ?4, progress = ?5, status = ?6
             WHERE id = ?7",
            params![
                buyer.trim(),
                product.trim(),
                quantity.trim(),
                due.trim(),
                progress,
                status,
                id
            ],
        )
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Order not found.".into());
    }

    transaction.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_order(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let changed = connection
        .execute("DELETE FROM orders WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Order not found.".into());
    }

    Ok(())
}

// List all materials with calculated current stock.
#[tauri::command]
fn list_materials(app: AppHandle) -> Result<Vec<Material>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT
                m.id,
                m.sku,
                m.name,
                m.category,
                m.unit,
                m.minimum_stock,
                COALESCE(SUM(t.quantity_change), 0) AS current_stock,
                m.notes,
                m.created_at
             FROM materials m
             LEFT JOIN inventory_transactions t
                ON t.material_id = m.id
             GROUP BY m.id
             ORDER BY m.name COLLATE NOCASE ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Material {
                id: row.get(0)?,
                sku: row.get(1)?,
                name: row.get(2)?,
                category: row.get(3)?,
                unit: row.get(4)?,
                minimum_stock: row.get(5)?,
                current_stock: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut materials = Vec::new();

    for material in rows {
        materials.push(material.map_err(|e| e.to_string())?);
    }

    Ok(materials)
}

// Create a new material.
// List all suppliers.
#[tauri::command]
fn list_purchase_orders(app: AppHandle) -> Result<Vec<PurchaseOrder>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT
                p.id,
                p.po_number,
                p.supplier_id,
                s.name,
                p.order_date,
                p.expected_delivery_date,
                p.status,
                p.notes,
                COALESCE(SUM(i.ordered_quantity * i.unit_price), 0),
                p.created_at
             FROM purchase_orders p
             INNER JOIN suppliers s ON s.id = p.supplier_id
             LEFT JOIN purchase_order_items i
                ON i.purchase_order_id = p.id
             GROUP BY p.id
             ORDER BY p.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(PurchaseOrder {
                id: row.get(0)?,
                po_number: row.get(1)?,
                supplier_id: row.get(2)?,
                supplier_name: row.get(3)?,
                order_date: row.get(4)?,
                expected_delivery_date: row.get(5)?,
                status: row.get(6)?,
                notes: row.get(7)?,
                total_amount: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut purchase_orders = Vec::new();

    for order in rows {
        purchase_orders.push(order.map_err(|e| e.to_string())?);
    }

    Ok(purchase_orders)
}

#[tauri::command]
fn create_purchase_order(
    app: AppHandle,
    po_number: String,
    supplier_id: String,
    order_date: String,
    expected_delivery_date: String,
    notes: String,
    items: Vec<PurchaseOrderItemInput>,
) -> Result<String, String> {
    if po_number.trim().is_empty() {
        return Err("PO number is required.".into());
    }

    if supplier_id.trim().is_empty() {
        return Err("Supplier is required.".into());
    }

    if order_date.trim().is_empty() {
        return Err("Order date is required.".into());
    }

    if items.is_empty() {
        return Err("At least one material item is required.".into());
    }

    let mut seen_materials = std::collections::HashSet::new();

    for item in &items {
        if item.material_id.trim().is_empty() {
            return Err("Every line item must have a material.".into());
        }

        if !item.ordered_quantity.is_finite() || item.ordered_quantity <= 0.0 {
            return Err("Ordered quantity must be greater than zero.".into());
        }

        if !item.unit_price.is_finite() || item.unit_price < 0.0 {
            return Err("Unit price must be a valid non-negative number.".into());
        }

        if !seen_materials.insert(item.material_id.trim().to_string()) {
            return Err("A material can only appear once in a purchase order.".into());
        }
    }

    let mut connection = database_connection(&app)?;

    let transaction = connection
        .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;

    let supplier_exists: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM suppliers WHERE id = ?1)",
            params![supplier_id.trim()],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !supplier_exists {
        return Err("Selected supplier was not found.".into());
    }

    for item in &items {
        let material_exists: bool = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM materials WHERE id = ?1)",
                params![item.material_id.trim()],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if !material_exists {
            return Err(format!("Material not found: {}", item.material_id));
        }
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let id = format!("PO-{timestamp}");

    transaction
        .execute(
            "INSERT INTO purchase_orders (
                id,
                po_number,
                supplier_id,
                order_date,
                expected_delivery_date,
                status,
                notes
             )
             VALUES (?1, ?2, ?3, ?4, ?5, 'Draft', ?6)",
            params![
                id,
                po_number.trim(),
                supplier_id.trim(),
                order_date.trim(),
                expected_delivery_date.trim(),
                notes.trim()
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                "This PO number already exists.".to_string()
            } else {
                e.to_string()
            }
        })?;

    for (index, item) in items.iter().enumerate() {
        let item_id = format!("POI-{timestamp}-{index}");

        transaction
            .execute(
                "INSERT INTO purchase_order_items (
                    id,
                    purchase_order_id,
                    material_id,
                    ordered_quantity,
                    received_quantity,
                    unit_price
                 )
                 VALUES (?1, ?2, ?3, ?4, 0, ?5)",
                params![
                    item_id,
                    id,
                    item.material_id.trim(),
                    item.ordered_quantity,
                    item.unit_price
                ],
            )
            .map_err(|e| e.to_string())?;
    }

    transaction.commit().map_err(|e| e.to_string())?;

    Ok(id)
}
#[tauri::command]
fn list_purchase_order_items(
    app: AppHandle,
    purchase_order_id: String,
) -> Result<Vec<PurchaseOrderItem>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT
                i.id,
                i.purchase_order_id,
                i.material_id,
                m.name,
                m.sku,
                m.unit,
                i.ordered_quantity,
                i.received_quantity,
                i.unit_price,
                i.ordered_quantity * i.unit_price
             FROM purchase_order_items i
             INNER JOIN materials m ON m.id = i.material_id
             WHERE i.purchase_order_id = ?1
             ORDER BY i.created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map(params![purchase_order_id.trim()], |row| {
            Ok(PurchaseOrderItem {
                id: row.get(0)?,
                purchase_order_id: row.get(1)?,
                material_id: row.get(2)?,
                material_name: row.get(3)?,
                sku: row.get(4)?,
                unit: row.get(5)?,
                ordered_quantity: row.get(6)?,
                received_quantity: row.get(7)?,
                unit_price: row.get(8)?,
                subtotal: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();

    for item in rows {
        items.push(item.map_err(|e| e.to_string())?);
    }

    Ok(items)
}

#[tauri::command]
fn list_purchase_order_receipts(
    app: AppHandle,
    purchase_order_id: String,
) -> Result<Vec<PurchaseOrderReceipt>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT
                r.id,
                r.purchase_order_item_id,
                i.material_id,
                m.name,
                r.quantity_received,
                r.receipt_date,
                r.inventory_transaction_id,
                r.notes,
                r.created_at
             FROM purchase_order_receipts r
             INNER JOIN purchase_order_items i
                ON i.id = r.purchase_order_item_id
             INNER JOIN materials m ON m.id = i.material_id
             WHERE i.purchase_order_id = ?1
             ORDER BY r.receipt_date DESC, r.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map(params![purchase_order_id.trim()], |row| {
            Ok(PurchaseOrderReceipt {
                id: row.get(0)?,
                purchase_order_item_id: row.get(1)?,
                material_id: row.get(2)?,
                material_name: row.get(3)?,
                quantity_received: row.get(4)?,
                receipt_date: row.get(5)?,
                inventory_transaction_id: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut receipts = Vec::new();

    for receipt in rows {
        receipts.push(receipt.map_err(|e| e.to_string())?);
    }

    Ok(receipts)
}

#[tauri::command]
fn update_purchase_order_status(
    app: AppHandle,
    purchase_order_id: String,
    status: String,
) -> Result<(), String> {
    let allowed_statuses = ["Draft", "Pending", "Ordered", "Cancelled"];

    if !allowed_statuses.contains(&status.as_str()) {
        return Err("Invalid status. Select Draft, Pending, Ordered or Cancelled.".into());
    }

    let mut connection = database_connection(&app)?;

    let transaction = connection
        .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;

    let current_status: String = transaction
        .query_row(
            "SELECT status FROM purchase_orders WHERE id = ?1",
            params![purchase_order_id.trim()],
            |row| row.get(0),
        )
        .map_err(|_| "Purchase order was not found.".to_string())?;

    let received_quantity: f64 = transaction
        .query_row(
            "SELECT COALESCE(SUM(received_quantity), 0)
             FROM purchase_order_items
             WHERE purchase_order_id = ?1",
            params![purchase_order_id.trim()],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if status == "Draft" && current_status != "Draft" {
        return Err("An existing purchase order cannot be moved back to Draft.".into());
    }

    if status == "Pending" && current_status != "Draft" && current_status != "Pending" {
        return Err("Only Draft purchase orders can be moved to Pending.".into());
    }

    if status == "Ordered"
        && current_status != "Draft"
        && current_status != "Pending"
        && current_status != "Ordered"
    {
        return Err("This purchase order cannot be marked as Ordered.".into());
    }

    if status == "Cancelled" && received_quantity > 0.0000001 {
        return Err("A purchase order with received materials cannot be cancelled.".into());
    }

    if current_status == "Received" || current_status == "Cancelled" {
        if current_status != status {
            return Err("This purchase order is already closed.".into());
        }
    }

    transaction
        .execute(
            "UPDATE purchase_orders SET status = ?1 WHERE id = ?2",
            params![status, purchase_order_id.trim()],
        )
        .map_err(|e| e.to_string())?;

    transaction.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn receive_purchase_order_item(
    app: AppHandle,
    receipt_id: String,
    purchase_order_item_id: String,
    quantity_received: f64,
    receipt_date: String,
    notes: String,
) -> Result<PurchaseOrderReceipt, String> {
    if receipt_id.trim().is_empty() {
        return Err("Receipt ID is required.".into());
    }

    if purchase_order_item_id.trim().is_empty() {
        return Err("Purchase order item is required.".into());
    }

    if !quantity_received.is_finite() || quantity_received <= 0.0 {
        return Err("Received quantity must be greater than zero.".into());
    }

    if receipt_date.trim().is_empty() {
        return Err("Receipt date is required.".into());
    }

    let mut connection = database_connection(&app)?;

    let transaction = connection
        .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;

    // Load the purchase order line and its current status.
    let item = transaction
        .query_row(
            "SELECT
                i.purchase_order_id,
                i.material_id,
                m.name,
                i.ordered_quantity,
                i.received_quantity,
                p.status,
                p.po_number
             FROM purchase_order_items i
             INNER JOIN materials m ON m.id = i.material_id
             INNER JOIN purchase_orders p
                ON p.id = i.purchase_order_id
             WHERE i.id = ?1",
            params![purchase_order_item_id.trim()],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, f64>(3)?,
                    row.get::<_, f64>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            },
        )
        .map_err(|_| "Purchase order item was not found.".to_string())?;

    let (
        purchase_order_id,
        material_id,
        material_name,
        ordered_quantity,
        already_received,
        current_status,
        po_number,
    ) = item;

    if current_status != "Pending"
        && current_status != "Ordered"
        && current_status != "Partially Received"
    {
        return Err(
            "Only Pending, Ordered or Partially Received orders can receive materials.".into(),
        );
    }

    let remaining = ordered_quantity - already_received;

    if quantity_received > remaining + 0.0000001 {
        return Err(format!(
            "Received quantity exceeds the remaining quantity. Remaining: {remaining}"
        ));
    }

    // Use a caller-generated unique ID. Reusing it is rejected by the
    // primary key / unique constraints, preventing duplicate retries.
    let receipt_id = receipt_id.trim().to_string();
    let inventory_transaction_id = format!("INV-{receipt_id}");

    let reference = format!("PO: {po_number}");
    let inventory_notes = if notes.trim().is_empty() {
        format!("Material received against purchase order {po_number}")
    } else {
        format!("PO receipt: {}", notes.trim())
    };

    // Update the ordered line only if the new total stays within its limit.
    let updated = transaction
        .execute(
            "UPDATE purchase_order_items
             SET received_quantity = received_quantity + ?1
             WHERE id = ?2
               AND received_quantity + ?1 <= ordered_quantity + 0.0000001",
            params![quantity_received, purchase_order_item_id.trim()],
        )
        .map_err(|e| e.to_string())?;

    if updated != 1 {
        return Err("Could not update received quantity. Please refresh and try again.".into());
    }

    // Insert the inventory Stock In transaction in the same SQLite transaction.
    transaction
        .execute(
            "INSERT INTO inventory_transactions (
                id,
                material_id,
                transaction_type,
                quantity_change,
                transaction_date,
                reference,
                notes
             )
             VALUES (?1, ?2, 'Stock In', ?3, ?4, ?5, ?6)",
            params![
                inventory_transaction_id,
                material_id,
                quantity_received,
                receipt_date.trim(),
                reference,
                inventory_notes
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                "This receipt has already been processed.".to_string()
            } else {
                e.to_string()
            }
        })?;

    // Record the receipt linked to its inventory transaction.
    transaction
        .execute(
            "INSERT INTO purchase_order_receipts (
                id,
                purchase_order_item_id,
                quantity_received,
                receipt_date,
                inventory_transaction_id,
                notes
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                receipt_id,
                purchase_order_item_id.trim(),
                quantity_received,
                receipt_date.trim(),
                inventory_transaction_id,
                notes.trim()
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                "This receipt has already been processed.".to_string()
            } else {
                e.to_string()
            }
        })?;

    // Recalculate the PO status from all its line items.
    let has_remaining_items: bool = transaction
        .query_row(
            "SELECT EXISTS(
                SELECT 1
                FROM purchase_order_items
                WHERE purchase_order_id = ?1
                  AND received_quantity < ordered_quantity - 0.0000001
             )",
            params![purchase_order_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let new_status = if has_remaining_items {
        "Partially Received"
    } else {
        "Received"
    };

    transaction
        .execute(
            "UPDATE purchase_orders SET status = ?1 WHERE id = ?2",
            params![new_status, purchase_order_id],
        )
        .map_err(|e| e.to_string())?;

    let saved = transaction
        .query_row(
            "SELECT
                r.id,
                r.purchase_order_item_id,
                i.material_id,
                m.name,
                r.quantity_received,
                r.receipt_date,
                r.inventory_transaction_id,
                r.notes,
                r.created_at
             FROM purchase_order_receipts r
             INNER JOIN purchase_order_items i
                ON i.id = r.purchase_order_item_id
             INNER JOIN materials m ON m.id = i.material_id
             WHERE r.id = ?1",
            params![receipt_id],
            |row| {
                Ok(PurchaseOrderReceipt {
                    id: row.get(0)?,
                    purchase_order_item_id: row.get(1)?,
                    material_id: row.get(2)?,
                    material_name: row.get(3)?,
                    quantity_received: row.get(4)?,
                    receipt_date: row.get(5)?,
                    inventory_transaction_id: row.get(6)?,
                    notes: row.get(7)?,
                    created_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    transaction.commit().map_err(|e| e.to_string())?;

    let _ = material_name;

    Ok(saved)
}
#[tauri::command]
fn list_suppliers(app: AppHandle) -> Result<Vec<Supplier>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT id, name, contact_person, phone, email, address, notes, created_at
             FROM suppliers
             ORDER BY name COLLATE NOCASE ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Supplier {
                id: row.get(0)?,
                name: row.get(1)?,
                contact_person: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                address: row.get(5)?,
                notes: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut suppliers = Vec::new();

    for supplier in rows {
        suppliers.push(supplier.map_err(|e| e.to_string())?);
    }

    Ok(suppliers)
}

// Create a new supplier.
#[tauri::command]
fn create_supplier(
    app: AppHandle,
    name: String,
    contact_person: String,
    phone: String,
    email: String,
    address: String,
    notes: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Supplier name is required.".into());
    }

    let connection = database_connection(&app)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    connection
        .execute(
            "INSERT INTO suppliers
            (id, name, contact_person, phone, email, address, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                format!("SUP-{timestamp}"),
                name.trim(),
                contact_person.trim(),
                phone.trim(),
                email.trim(),
                address.trim(),
                notes.trim()
            ],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Update an existing supplier.
#[tauri::command]
fn update_supplier(
    app: AppHandle,
    id: String,
    name: String,
    contact_person: String,
    phone: String,
    email: String,
    address: String,
    notes: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Supplier name is required.".into());
    }

    let connection = database_connection(&app)?;

    let changed = connection
        .execute(
            "UPDATE suppliers
         SET name = ?1, contact_person = ?2, phone = ?3,
             email = ?4, address = ?5, notes = ?6
         WHERE id = ?7",
            params![
                name.trim(),
                contact_person.trim(),
                phone.trim(),
                email.trim(),
                address.trim(),
                notes.trim(),
                id
            ],
        )
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Supplier not found.".into());
    }

    Ok(())
}

// Delete a supplier.
#[tauri::command]
fn delete_supplier(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let changed = connection
        .execute("DELETE FROM suppliers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Supplier not found.".into());
    }

    Ok(())
}
#[tauri::command]
fn list_buyers(app: AppHandle) -> Result<Vec<Buyer>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT id, name, contact_person, email, phone,
                    country, address, notes, created_at
             FROM buyers
             ORDER BY name COLLATE NOCASE ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Buyer {
                id: row.get(0)?,
                name: row.get(1)?,
                contact_person: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                country: row.get(5)?,
                address: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut buyers = Vec::new();

    for buyer in rows {
        buyers.push(buyer.map_err(|e| e.to_string())?);
    }

    Ok(buyers)
}

#[tauri::command]
fn create_buyer(
    app: AppHandle,
    name: String,
    contact_person: String,
    email: String,
    phone: String,
    country: String,
    address: String,
    notes: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Buyer name is required.".into());
    }

    let connection = database_connection(&app)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    connection
        .execute(
            "INSERT INTO buyers (
                id, name, contact_person, email, phone,
                country, address, notes
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                format!("BUY-{timestamp}"),
                name.trim(),
                contact_person.trim(),
                email.trim(),
                phone.trim(),
                country.trim(),
                address.trim(),
                notes.trim()
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "A buyer with this name already exists.".to_string()
            } else {
                e.to_string()
            }
        })?;

    Ok(())
}

#[tauri::command]
fn update_buyer(
    app: AppHandle,
    id: String,
    name: String,
    contact_person: String,
    email: String,
    phone: String,
    country: String,
    address: String,
    notes: String,
) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Buyer name is required.".into());
    }

    let mut connection = database_connection(&app)?;
    let transaction = connection
        .transaction()
        .map_err(|e| e.to_string())?;

    let old_name: String = transaction
        .query_row(
            "SELECT name FROM buyers WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|_| "Buyer not found.".to_string())?;

    transaction
        .execute(
            "UPDATE buyers
             SET name = ?1, contact_person = ?2, email = ?3,
                 phone = ?4, country = ?5, address = ?6, notes = ?7
             WHERE id = ?8",
            params![
                name.trim(),
                contact_person.trim(),
                email.trim(),
                phone.trim(),
                country.trim(),
                address.trim(),
                notes.trim(),
                id
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "A buyer with this name already exists.".to_string()
            } else {
                e.to_string()
            }
        })?;

    transaction
        .execute(
            "UPDATE orders
             SET buyer = ?1
             WHERE buyer = ?2 COLLATE NOCASE",
            params![name.trim(), old_name],
        )
        .map_err(|e| e.to_string())?;

    transaction.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_buyer(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let buyer_name: String = connection
        .query_row(
            "SELECT name FROM buyers WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| {
            if e.to_string().contains("Query returned no rows") {
                "Buyer not found.".to_string()
            } else {
                e.to_string()
            }
        })?;

    let linked_orders: i64 = connection
        .query_row(
            "SELECT COUNT(*) FROM orders
             WHERE buyer = ?1 COLLATE NOCASE",
            params![buyer_name],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if linked_orders > 0 {
        return Err(format!(
            "This buyer has {} existing order(s). Delete is blocked to preserve order history.",
            linked_orders
        ));
    }

    let changed = connection
        .execute("DELETE FROM buyers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Buyer not found.".into());
    }

    Ok(())
}
#[tauri::command]
fn list_workers(app: AppHandle) -> Result<Vec<Worker>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT id, employee_code, name, phone, address,
                    designation, department, skills, joining_date,
                    status, notes, created_at
             FROM workers
             ORDER BY name COLLATE NOCASE ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Worker {
                id: row.get(0)?,
                employee_code: row.get(1)?,
                name: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
                designation: row.get(5)?,
                department: row.get(6)?,
                skills: row.get(7)?,
                joining_date: row.get(8)?,
                status: row.get(9)?,
                notes: row.get(10)?,
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut workers = Vec::new();

    for worker in rows {
        workers.push(worker.map_err(|e| e.to_string())?);
    }

    Ok(workers)
}

#[tauri::command]
fn create_worker(
    app: AppHandle,
    employee_code: String,
    name: String,
    phone: String,
    address: String,
    designation: String,
    department: String,
    skills: String,
    joining_date: String,
    status: String,
    notes: String,
) -> Result<(), String> {
    if employee_code.trim().is_empty() {
        return Err("Employee ID is required.".into());
    }

    if name.trim().is_empty() {
        return Err("Worker name is required.".into());
    }

    if !["Active", "Inactive", "On Leave"].contains(&status.as_str()) {
        return Err("Invalid worker status.".into());
    }

    let connection = database_connection(&app)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    connection
        .execute(
            "INSERT INTO workers (
                id, employee_code, name, phone, address,
                designation, department, skills, joining_date,
                status, notes
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                format!("WRK-{timestamp}"),
                employee_code.trim(),
                name.trim(),
                phone.trim(),
                address.trim(),
                designation.trim(),
                department.trim(),
                skills.trim(),
                joining_date.trim(),
                status,
                notes.trim()
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "This Employee ID already exists.".to_string()
            } else {
                e.to_string()
            }
        })?;

    Ok(())
}

#[tauri::command]
fn update_worker(
    app: AppHandle,
    id: String,
    employee_code: String,
    name: String,
    phone: String,
    address: String,
    designation: String,
    department: String,
    skills: String,
    joining_date: String,
    status: String,
    notes: String,
) -> Result<(), String> {
    if employee_code.trim().is_empty() {
        return Err("Employee ID is required.".into());
    }

    if name.trim().is_empty() {
        return Err("Worker name is required.".into());
    }

    if !["Active", "Inactive", "On Leave"].contains(&status.as_str()) {
        return Err("Invalid worker status.".into());
    }

    let connection = database_connection(&app)?;

    let changed = connection
        .execute(
            "UPDATE workers
             SET employee_code = ?1,
                 name = ?2,
                 phone = ?3,
                 address = ?4,
                 designation = ?5,
                 department = ?6,
                 skills = ?7,
                 joining_date = ?8,
                 status = ?9,
                 notes = ?10
             WHERE id = ?11",
            params![
                employee_code.trim(),
                name.trim(),
                phone.trim(),
                address.trim(),
                designation.trim(),
                department.trim(),
                skills.trim(),
                joining_date.trim(),
                status,
                notes.trim(),
                id
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "This Employee ID already exists.".to_string()
            } else {
                e.to_string()
            }
        })?;

    if changed == 0 {
        return Err("Worker not found.".into());
    }

    Ok(())
}

#[tauri::command]
fn delete_worker(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let changed = connection
        .execute("DELETE FROM workers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Worker not found.".into());
    }

    Ok(())
}

// Machine management commands.
#[tauri::command]
fn list_machines(app: AppHandle) -> Result<Vec<Machine>, String> {
    let connection = database_connection(&app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, machine_code, name, machine_type, brand, model,
                    department, location, capacity_per_hour, capacity_unit,
                    status, purchase_date, last_maintenance_date,
                    next_maintenance_date, notes, created_at
             FROM machines
             ORDER BY name COLLATE NOCASE ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(Machine {
                id: row.get(0)?,
                machine_code: row.get(1)?,
                name: row.get(2)?,
                machine_type: row.get(3)?,
                brand: row.get(4)?,
                model: row.get(5)?,
                department: row.get(6)?,
                location: row.get(7)?,
                capacity_per_hour: row.get(8)?,
                capacity_unit: row.get(9)?,
                status: row.get(10)?,
                purchase_date: row.get(11)?,
                last_maintenance_date: row.get(12)?,
                next_maintenance_date: row.get(13)?,
                notes: row.get(14)?,
                created_at: row.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut machines = Vec::new();
    for row in rows {
        machines.push(row.map_err(|e| e.to_string())?);
    }
    Ok(machines)
}

#[tauri::command]
fn create_machine(
    app: AppHandle,
    machine_code: String,
    name: String,
    machine_type: String,
    brand: String,
    model: String,
    department: String,
    location: String,
    capacity_per_hour: f64,
    capacity_unit: String,
    status: String,
    purchase_date: String,
    last_maintenance_date: String,
    next_maintenance_date: String,
    notes: String,
) -> Result<(), String> {
    if machine_code.trim().is_empty() || name.trim().is_empty() || machine_type.trim().is_empty() {
        return Err("Machine ID, name and machine type are required.".into());
    }

    if !capacity_per_hour.is_finite() || capacity_per_hour < 0.0 {
        return Err("Capacity must be a valid non-negative number.".into());
    }

    if capacity_unit.trim().is_empty() {
        return Err("Capacity unit is required.".into());
    }

    if !["Active", "Idle", "Maintenance", "Inactive"].contains(&status.as_str()) {
        return Err("Invalid machine status.".into());
    }

    let connection = database_connection(&app)?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    connection
        .execute(
            "INSERT INTO machines (
                id, machine_code, name, machine_type, brand, model,
                department, location, capacity_per_hour, capacity_unit,
                status, purchase_date, last_maintenance_date,
                next_maintenance_date, notes
             ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
                ?11, ?12, ?13, ?14, ?15
             )",
            params![
                format!("MCH-{timestamp}"),
                machine_code.trim(),
                name.trim(),
                machine_type.trim(),
                brand.trim(),
                model.trim(),
                department.trim(),
                location.trim(),
                capacity_per_hour,
                capacity_unit.trim(),
                status,
                purchase_date.trim(),
                last_maintenance_date.trim(),
                next_maintenance_date.trim(),
                notes.trim()
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "This Machine ID already exists.".to_string()
            } else {
                e.to_string()
            }
        })?;

    Ok(())
}

#[tauri::command]
fn update_machine(
    app: AppHandle,
    id: String,
    machine_code: String,
    name: String,
    machine_type: String,
    brand: String,
    model: String,
    department: String,
    location: String,
    capacity_per_hour: f64,
    capacity_unit: String,
    status: String,
    purchase_date: String,
    last_maintenance_date: String,
    next_maintenance_date: String,
    notes: String,
) -> Result<(), String> {
    if id.trim().is_empty()
        || machine_code.trim().is_empty()
        || name.trim().is_empty()
        || machine_type.trim().is_empty()
    {
        return Err("Machine ID, name and machine type are required.".into());
    }

    if !capacity_per_hour.is_finite() || capacity_per_hour < 0.0 {
        return Err("Capacity must be a valid non-negative number.".into());
    }

    if capacity_unit.trim().is_empty() {
        return Err("Capacity unit is required.".into());
    }

    if !["Active", "Idle", "Maintenance", "Inactive"].contains(&status.as_str()) {
        return Err("Invalid machine status.".into());
    }

    let connection = database_connection(&app)?;
    let changed = connection
        .execute(
            "UPDATE machines SET
                machine_code = ?1,
                name = ?2,
                machine_type = ?3,
                brand = ?4,
                model = ?5,
                department = ?6,
                location = ?7,
                capacity_per_hour = ?8,
                capacity_unit = ?9,
                status = ?10,
                purchase_date = ?11,
                last_maintenance_date = ?12,
                next_maintenance_date = ?13,
                notes = ?14
             WHERE id = ?15",
            params![
                machine_code.trim(),
                name.trim(),
                machine_type.trim(),
                brand.trim(),
                model.trim(),
                department.trim(),
                location.trim(),
                capacity_per_hour,
                capacity_unit.trim(),
                status,
                purchase_date.trim(),
                last_maintenance_date.trim(),
                next_maintenance_date.trim(),
                notes.trim(),
                id.trim()
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "This Machine ID already exists.".to_string()
            } else {
                e.to_string()
            }
        })?;

    if changed == 0 {
        return Err("Machine not found.".into());
    }

    Ok(())
}

#[tauri::command]
fn delete_machine(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;
    let changed = connection
        .execute("DELETE FROM machines WHERE id = ?1", params![id.trim()])
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Machine not found.".into());
    }

    Ok(())
}

#[tauri::command]
fn list_machine_maintenance(
    app: AppHandle,
    machine_id: String,
) -> Result<Vec<MachineMaintenance>, String> {
    let connection = database_connection(&app)?;
    let mut statement = connection
        .prepare(
            "SELECT mm.id, mm.machine_id, m.machine_code, m.name,
                    mm.service_date, mm.maintenance_type, mm.description,
                    mm.cost, mm.next_service_date, mm.performed_by,
                    mm.notes, mm.created_at
             FROM machine_maintenance mm
             JOIN machines m ON m.id = mm.machine_id
             WHERE mm.machine_id = ?1
             ORDER BY mm.service_date DESC, mm.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map(params![machine_id.trim()], |row| {
            Ok(MachineMaintenance {
                id: row.get(0)?,
                machine_id: row.get(1)?,
                machine_code: row.get(2)?,
                machine_name: row.get(3)?,
                service_date: row.get(4)?,
                maintenance_type: row.get(5)?,
                description: row.get(6)?,
                cost: row.get(7)?,
                next_service_date: row.get(8)?,
                performed_by: row.get(9)?,
                notes: row.get(10)?,
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut records = Vec::new();
    for row in rows {
        records.push(row.map_err(|e| e.to_string())?);
    }
    Ok(records)
}

#[tauri::command]
fn create_machine_maintenance(
    app: AppHandle,
    machine_id: String,
    service_date: String,
    maintenance_type: String,
    description: String,
    cost: f64,
    next_service_date: String,
    performed_by: String,
    notes: String,
) -> Result<(), String> {
    if machine_id.trim().is_empty()
        || service_date.trim().is_empty()
        || maintenance_type.trim().is_empty()
    {
        return Err("Machine, service date and maintenance type are required.".into());
    }

    if !cost.is_finite() || cost < 0.0 {
        return Err("Maintenance cost must be a valid non-negative number.".into());
    }

    let connection = database_connection(&app)?;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let record_id = format!("MNT-{timestamp}");

    connection
        .execute(
            "INSERT INTO machine_maintenance (
                id, machine_id, service_date, maintenance_type,
                description, cost, next_service_date, performed_by, notes
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                record_id,
                machine_id.trim(),
                service_date.trim(),
                maintenance_type.trim(),
                description.trim(),
                cost,
                next_service_date.trim(),
                performed_by.trim(),
                notes.trim()
            ],
        )
        .map_err(|e| e.to_string())?;

    connection
        .execute(
            "UPDATE machines
             SET last_maintenance_date = CASE
                    WHEN last_maintenance_date < ?1 THEN ?1
                    ELSE last_maintenance_date
                 END,
                 next_maintenance_date = ?2
             WHERE id = ?3",
            params![
                service_date.trim(),
                next_service_date.trim(),
                machine_id.trim()
            ],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_machine_maintenance(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let machine_id: Option<String> = connection
        .query_row(
            "SELECT machine_id FROM machine_maintenance WHERE id = ?1",
            params![id.trim()],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let machine_id = machine_id.ok_or_else(|| "Maintenance record not found.".to_string())?;

    connection
        .execute(
            "DELETE FROM machine_maintenance WHERE id = ?1",
            params![id.trim()],
        )
        .map_err(|e| e.to_string())?;

    connection
        .execute(
            "UPDATE machines
             SET last_maintenance_date = COALESCE(
                    (SELECT service_date FROM machine_maintenance
                     WHERE machine_id = ?1
                     ORDER BY service_date DESC, created_at DESC LIMIT 1), ''
                 ),
                 next_maintenance_date = COALESCE(
                    (SELECT next_service_date FROM machine_maintenance
                     WHERE machine_id = ?1
                     ORDER BY service_date DESC, created_at DESC LIMIT 1), ''
                 )
             WHERE id = ?1",
            params![machine_id],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}
#[tauri::command]
fn create_material(
    app: AppHandle,
    sku: String,
    name: String,
    category: String,
    unit: String,
    minimum_stock: f64,
    notes: String,
) -> Result<Material, String> {
    if sku.trim().is_empty()
        || name.trim().is_empty()
        || category.trim().is_empty()
        || unit.trim().is_empty()
    {
        return Err("SKU, name, category and unit are required.".into());
    }

    if !minimum_stock.is_finite() || minimum_stock < 0.0 {
        return Err("Minimum stock must be a valid non-negative number.".into());
    }

    let connection = database_connection(&app)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let material = Material {
        id: format!("MAT-{timestamp}"),
        sku: sku.trim().to_string(),
        name: name.trim().to_string(),
        category: category.trim().to_string(),
        unit: unit.trim().to_string(),
        minimum_stock,
        current_stock: 0.0,
        notes: notes.trim().to_string(),
        created_at: String::new(),
    };

    connection
        .execute(
            "INSERT INTO materials
                (id, sku, name, category, unit, minimum_stock, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                material.id,
                material.sku,
                material.name,
                material.category,
                material.unit,
                material.minimum_stock,
                material.notes,
            ],
        )
        .map_err(|e| e.to_string())?;

    let mut saved = material;

    saved.created_at = connection
        .query_row(
            "SELECT created_at FROM materials WHERE id = ?1",
            params![saved.id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(saved)
}

// Update an existing material.
#[tauri::command]
fn update_material(
    app: AppHandle,
    id: String,
    sku: String,
    name: String,
    category: String,
    unit: String,
    minimum_stock: f64,
    notes: String,
) -> Result<Material, String> {
    if id.trim().is_empty()
        || sku.trim().is_empty()
        || name.trim().is_empty()
        || category.trim().is_empty()
        || unit.trim().is_empty()
    {
        return Err("ID, SKU, name, category and unit are required.".into());
    }

    if !minimum_stock.is_finite() || minimum_stock < 0.0 {
        return Err("Minimum stock must be a valid non-negative number.".into());
    }

    let connection = database_connection(&app)?;

    let changed = connection
        .execute(
            "UPDATE materials
             SET sku = ?1,
                 name = ?2,
                 category = ?3,
                 unit = ?4,
                 minimum_stock = ?5,
                 notes = ?6
             WHERE id = ?7",
            params![
                sku.trim(),
                name.trim(),
                category.trim(),
                unit.trim(),
                minimum_stock,
                notes.trim(),
                id.trim(),
            ],
        )
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Material not found.".into());
    }

    let material = connection
        .query_row(
            "SELECT
                m.id,
                m.sku,
                m.name,
                m.category,
                m.unit,
                m.minimum_stock,
                COALESCE(
                    (SELECT SUM(t.quantity_change)
                     FROM inventory_transactions t
                     WHERE t.material_id = m.id),
                    0
                ),
                m.notes,
                m.created_at
             FROM materials m
             WHERE m.id = ?1",
            params![id.trim()],
            |row| {
                Ok(Material {
                    id: row.get(0)?,
                    sku: row.get(1)?,
                    name: row.get(2)?,
                    category: row.get(3)?,
                    unit: row.get(4)?,
                    minimum_stock: row.get(5)?,
                    current_stock: row.get(6)?,
                    notes: row.get(7)?,
                    created_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(material)
}

// Delete a material. Existing inventory history prevents deletion.
#[tauri::command]
fn delete_material(app: AppHandle, id: String) -> Result<(), String> {
    if id.trim().is_empty() {
        return Err("Material ID is required.".into());
    }

    let connection = database_connection(&app)?;

    let changed = connection
        .execute("DELETE FROM materials WHERE id = ?1", params![id.trim()])
        .map_err(|e| {
            format!("Could not delete material. It may have inventory history. Details: {e}")
        })?;

    if changed == 0 {
        return Err("Material not found.".into());
    }

    Ok(())
}

// List inventory transaction history.
#[tauri::command]
fn list_inventory_transactions(app: AppHandle) -> Result<Vec<InventoryTransaction>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT
                t.id,
                t.material_id,
                m.name,
                m.sku,
                t.transaction_type,
                t.quantity_change,
                t.transaction_date,
                t.reference,
                t.notes,
                t.created_at
             FROM inventory_transactions t
             INNER JOIN materials m ON m.id = t.material_id
             ORDER BY t.transaction_date DESC, t.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(InventoryTransaction {
                id: row.get(0)?,
                material_id: row.get(1)?,
                material_name: row.get(2)?,
                sku: row.get(3)?,
                transaction_type: row.get(4)?,
                quantity_change: row.get(5)?,
                transaction_date: row.get(6)?,
                reference: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut transactions = Vec::new();

    for transaction in rows {
        transactions.push(transaction.map_err(|e| e.to_string())?);
    }

    Ok(transactions)
}

// Create a stock transaction with atomic balance validation.
#[tauri::command]
fn create_inventory_transaction(
    app: AppHandle,
    material_id: String,
    transaction_type: String,
    quantity: f64,
    transaction_date: String,
    reference: String,
    notes: String,
) -> Result<InventoryTransaction, String> {
    if material_id.trim().is_empty() {
        return Err("Material is required.".into());
    }

    if !quantity.is_finite() || quantity == 0.0 {
        return Err("Quantity must be a valid non-zero number.".into());
    }

    if transaction_date.trim().is_empty() {
        return Err("Transaction date is required.".into());
    }

    let quantity_change = match transaction_type.as_str() {
        "Stock In" => {
            if quantity <= 0.0 {
                return Err("Stock In quantity must be positive.".into());
            }
            quantity
        }
        "Stock Out" => {
            if quantity <= 0.0 {
                return Err("Stock Out quantity must be positive.".into());
            }
            -quantity
        }
        "Adjustment" => quantity,
        _ => {
            return Err("Invalid transaction type.".into());
        }
    };

    let mut connection = database_connection(&app)?;

    let transaction = connection
        .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;

    let material_exists: bool = transaction
        .query_row(
            "SELECT EXISTS(
                SELECT 1 FROM materials WHERE id = ?1
             )",
            params![material_id.trim()],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !material_exists {
        return Err("Material not found.".into());
    }

    let current_stock: f64 = transaction
        .query_row(
            "SELECT COALESCE(SUM(quantity_change), 0)
             FROM inventory_transactions
             WHERE material_id = ?1",
            params![material_id.trim()],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let new_stock = current_stock + quantity_change;

    if new_stock < -0.0000001 {
        return Err(format!("Insufficient stock. Available: {current_stock}"));
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let id = format!("INV-{timestamp}");

    transaction
        .execute(
            "INSERT INTO inventory_transactions (
                id,
                material_id,
                transaction_type,
                quantity_change,
                transaction_date,
                reference,
                notes
             )
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                id,
                material_id.trim(),
                transaction_type,
                quantity_change,
                transaction_date.trim(),
                reference.trim(),
                notes.trim(),
            ],
        )
        .map_err(|e| e.to_string())?;

    let saved = transaction
        .query_row(
            "SELECT
                t.id,
                t.material_id,
                m.name,
                m.sku,
                t.transaction_type,
                t.quantity_change,
                t.transaction_date,
                t.reference,
                t.notes,
                t.created_at
             FROM inventory_transactions t
             INNER JOIN materials m ON m.id = t.material_id
             WHERE t.id = ?1",
            params![id],
            |row| {
                Ok(InventoryTransaction {
                    id: row.get(0)?,
                    material_id: row.get(1)?,
                    material_name: row.get(2)?,
                    sku: row.get(3)?,
                    transaction_type: row.get(4)?,
                    quantity_change: row.get(5)?,
                    transaction_date: row.get(6)?,
                    reference: row.get(7)?,
                    notes: row.get(8)?,
                    created_at: row.get(9)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    transaction.commit().map_err(|e| e.to_string())?;

    Ok(saved)
}
// List all production history entries.
#[tauri::command]
fn list_production_entries(app: AppHandle) -> Result<Vec<ProductionEntry>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT id, order_id, stage, completed_quantity,
                    production_date, notes, created_at
             FROM production_entries
             ORDER BY production_date DESC, rowid DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(ProductionEntry {
                id: row.get(0)?,
                order_id: row.get(1)?,
                stage: row.get(2)?,
                completed_quantity: row.get(3)?,
                production_date: row.get(4)?,
                notes: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut entries = Vec::new();

    for entry in rows {
        entries.push(entry.map_err(|e| e.to_string())?);
    }

    Ok(entries)
}

// Create a production history entry.
#[tauri::command]
fn create_production_entry(
    app: AppHandle,
    order_id: String,
    stage: String,
    completed_quantity: i64,
    production_date: String,
    notes: String,
) -> Result<ProductionEntry, String> {
    validate_production_stage(&stage)?;

    if production_date.trim().is_empty() {
        return Err("Production date is required.".into());
    }

    let connection = database_connection(&app)?;

    validate_production_quantity(&connection, &order_id, &stage, completed_quantity, None)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();

    let id = format!("PROD-{timestamp}");

    connection
        .execute(
            "INSERT INTO production_entries
             (id, order_id, stage, completed_quantity,
              production_date, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                id,
                order_id,
                stage,
                completed_quantity,
                production_date.trim(),
                notes.trim()
            ],
        )
        .map_err(|e| e.to_string())?;

    let entry = connection
        .query_row(
            "SELECT id, order_id, stage, completed_quantity,
                    production_date, notes, created_at
             FROM production_entries WHERE id = ?1",
            params![id],
            |row| {
                Ok(ProductionEntry {
                    id: row.get(0)?,
                    order_id: row.get(1)?,
                    stage: row.get(2)?,
                    completed_quantity: row.get(3)?,
                    production_date: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(entry)
}

// Update an existing production history entry.
#[tauri::command]
fn update_production_entry(
    app: AppHandle,
    id: String,
    order_id: String,
    stage: String,
    completed_quantity: i64,
    production_date: String,
    notes: String,
) -> Result<(), String> {
    validate_production_stage(&stage)?;

    if production_date.trim().is_empty() {
        return Err("Production date is required.".into());
    }

    let connection = database_connection(&app)?;

    validate_production_quantity(
        &connection,
        &order_id,
        &stage,
        completed_quantity,
        Some(&id),
    )?;

    let changed = connection
        .execute(
            "UPDATE production_entries
             SET order_id = ?1, stage = ?2, completed_quantity = ?3,
                 production_date = ?4, notes = ?5
             WHERE id = ?6",
            params![
                order_id,
                stage,
                completed_quantity,
                production_date.trim(),
                notes.trim(),
                id
            ],
        )
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Production entry not found.".into());
    }

    Ok(())
}

// Delete a production history entry.
#[tauri::command]
fn delete_production_entry(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let changed = connection
        .execute("DELETE FROM production_entries WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Production entry not found.".into());
    }

    Ok(())
}

fn is_valid_schedule_date(value: &str) -> bool {
    let parts: Vec<&str> = value.split('-').collect();

    if parts.len() != 3 || parts[0].len() != 4 || parts[1].len() != 2 || parts[2].len() != 2 {
        return false;
    }

    let year = match parts[0].parse::<i32>() {
        Ok(value) => value,
        Err(_) => return false,
    };

    let month = match parts[1].parse::<u32>() {
        Ok(value) => value,
        Err(_) => return false,
    };

    let day = match parts[2].parse::<u32>() {
        Ok(value) => value,
        Err(_) => return false,
    };

    let leap_year = year % 400 == 0 || (year % 4 == 0 && year % 100 != 0);

    let days_in_month = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap_year => 29,
        2 => 28,
        _ => return false,
    };

    day >= 1 && day <= days_in_month
}

fn validate_schedule(
    stage: &str,
    planned_quantity: i64,
    start_date: &str,
    target_date: &str,
    status: &str,
) -> Result<(), String> {
    validate_production_stage(stage)?;

    if planned_quantity <= 0 {
        return Err("Planned quantity must be greater than zero.".into());
    }

    let start = start_date.trim();
    let target = target_date.trim();

    if !is_valid_schedule_date(start) {
        return Err("Invalid start date. Use a valid YYYY-MM-DD date.".into());
    }

    if !is_valid_schedule_date(target) {
        return Err("Invalid target date. Use a valid YYYY-MM-DD date.".into());
    }

    if target < start {
        return Err("Target date cannot be earlier than start date.".into());
    }

    if !["Planned", "In Progress", "Completed", "Delayed"].contains(&status) {
        return Err("Invalid schedule status.".into());
    }

    Ok(())
}
#[tauri::command]
fn list_production_schedules(app: AppHandle) -> Result<Vec<ProductionSchedule>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT s.id, s.order_id, o.buyer, o.product, o.quantity,
                s.stage, s.planned_quantity,
                COALESCE((
                    SELECT SUM(p.completed_quantity)
                    FROM production_entries p
                    WHERE p.order_id = s.order_id AND p.stage = s.stage
                ), 0),
                s.start_date, s.target_date, s.status, s.notes, s.created_at
         FROM production_schedules s
         JOIN orders o ON o.id = s.order_id
         ORDER BY s.start_date ASC, s.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = statement
        .query_map([], |row| {
            Ok(ProductionSchedule {
                id: row.get(0)?,
                order_id: row.get(1)?,
                buyer: row.get(2)?,
                product: row.get(3)?,
                order_quantity: row.get(4)?,
                stage: row.get(5)?,
                planned_quantity: row.get(6)?,
                actual_quantity: row.get(7)?,
                start_date: row.get(8)?,
                target_date: row.get(9)?,
                status: row.get(10)?,
                notes: row.get(11)?,
                created_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut schedules = Vec::new();

    for row in rows {
        schedules.push(row.map_err(|e| e.to_string())?);
    }

    Ok(schedules)
}

#[tauri::command]
fn create_production_schedule(
    app: AppHandle,
    order_id: String,
    stage: String,
    planned_quantity: i64,
    start_date: String,
    target_date: String,
    status: String,
    notes: String,
) -> Result<(), String> {
    validate_schedule(&stage, planned_quantity, &start_date, &target_date, &status)?;

    let connection = database_connection(&app)?;

    let exists: bool = connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM orders WHERE id = ?1)",
            params![order_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !exists {
        return Err("Selected order was not found.".into());
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();

    let id = format!("SCHED-{timestamp}");

    connection
        .execute(
            "INSERT INTO production_schedules
         (id, order_id, stage, planned_quantity, start_date, target_date, status, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id,
                order_id,
                stage,
                planned_quantity,
                start_date.trim(),
                target_date.trim(),
                status,
                notes.trim()
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "A schedule already exists for this order and stage.".to_string()
            } else {
                e.to_string()
            }
        })?;

    Ok(())
}

#[tauri::command]
fn update_production_schedule(
    app: AppHandle,
    id: String,
    order_id: String,
    stage: String,
    planned_quantity: i64,
    start_date: String,
    target_date: String,
    status: String,
    notes: String,
) -> Result<(), String> {
    validate_schedule(&stage, planned_quantity, &start_date, &target_date, &status)?;

    let connection = database_connection(&app)?;

    let changed = connection
        .execute(
            "UPDATE production_schedules
         SET order_id = ?1, stage = ?2, planned_quantity = ?3,
             start_date = ?4, target_date = ?5, status = ?6, notes = ?7
         WHERE id = ?8",
            params![
                order_id,
                stage,
                planned_quantity,
                start_date.trim(),
                target_date.trim(),
                status,
                notes.trim(),
                id
            ],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                "A schedule already exists for this order and stage.".to_string()
            } else {
                e.to_string()
            }
        })?;

    if changed == 0 {
        return Err("Production schedule not found.".into());
    }

    Ok(())
}

#[tauri::command]
fn delete_production_schedule(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let changed = connection
        .execute(
            "DELETE FROM production_schedules WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Production schedule not found.".into());
    }

    Ok(())
}
#[tauri::command]
fn save_pdf_file(path: String, pdf_data: Vec<u8>) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("A valid PDF save path is required.".into());
    }

    if !path.to_lowercase().ends_with(".pdf") {
        return Err("The selected file must have a .pdf extension.".into());
    }

    if pdf_data.is_empty() {
        return Err("The generated PDF is empty.".into());
    }

    std::fs::write(&path, &pdf_data)
        .map_err(|error| format!("Could not save PDF: {}", error))?;

    Ok(())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            initialize_database(&app.handle()).map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_pdf_file,
            get_factory_health_report,
            get_reports_summary,
            list_orders,
            create_order,
            update_order,
            delete_order,
            list_materials,
            list_purchase_order_items,
            list_purchase_order_receipts,
            update_purchase_order_status,
            receive_purchase_order_item,
            list_purchase_orders,
            create_purchase_order,
            list_suppliers,
            create_supplier,
            update_supplier,
            delete_supplier,
            list_buyers,
            create_buyer,
            update_buyer,
            delete_buyer,
            list_workers,
            create_worker,
            update_worker,
            list_machines,
            create_machine,
            update_machine,
            delete_machine,
            list_machine_maintenance,
            create_machine_maintenance,
            delete_machine_maintenance,
            delete_worker,
            create_material,
            update_material,
            delete_material,
            list_inventory_transactions,
            create_inventory_transaction,
            list_production_entries,
            create_production_entry,
            update_production_entry,
            delete_production_entry,
            list_production_schedules,
            create_production_schedule,
            update_production_schedule,
            delete_production_schedule
        ])
        .run(tauri::generate_context!())
        .expect("error while running OrderFit");
}









