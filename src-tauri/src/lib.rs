
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

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
const PRODUCTION_STAGES: [&str; 4] =
    ["Cutting", "Sewing", "Finishing", "QC"];

fn database_connection(app: &AppHandle) -> Result<Connection, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    std::fs::create_dir_all(&directory)
        .map_err(|e| e.to_string())?;

    let database_path = directory.join("orderfit.db");

    let connection =
        Connection::open(database_path).map_err(|e| e.to_string())?;

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
        return Err(
            "Invalid stage. Use Cutting, Sewing, Finishing or QC.".into(),
        );
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
    if buyer.trim().is_empty()
        || product.trim().is_empty()
        || quantity.trim().is_empty()
    {
        return Err("Buyer, product and quantity are required.".into());
    }

    let connection = database_connection(&app)?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let id = format!("ORD-{timestamp}");

    let order = Order {
        id,
        buyer: buyer.trim().to_string(),
        product: product.trim().to_string(),
        quantity: quantity.trim().to_string(),
        due: due.trim().to_string(),
        progress: 0,
        status: "On Track".to_string(),
    };

    connection
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
    if buyer.trim().is_empty()
        || product.trim().is_empty()
        || quantity.trim().is_empty()
    {
        return Err("Buyer, product and quantity are required.".into());
    }

    if !(0..=100).contains(&progress) {
        return Err("Progress must be between 0 and 100.".into());
    }

    if !["On Track", "At Risk", "Completed"].contains(&status.as_str()) {
        return Err("Invalid order status.".into());
    }

    let connection = database_connection(&app)?;

    let changed = connection
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

    Ok(())
}

#[tauri::command]
fn delete_order(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let changed = connection
        .execute(
            "DELETE FROM orders WHERE id = ?1",
            params![id],
        )
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
        return Err(
            "SKU, name, category and unit are required.".into(),
        );
    }

    if !minimum_stock.is_finite() || minimum_stock < 0.0 {
        return Err(
            "Minimum stock must be a valid non-negative number.".into(),
        );
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
        .execute(
            "DELETE FROM materials WHERE id = ?1",
            params![id.trim()],
        )
        .map_err(|e| {
            format!(
                "Could not delete material. It may have inventory history. Details: {e}"
            )
        })?;

    if changed == 0 {
        return Err("Material not found.".into());
    }

    Ok(())
}

// List inventory transaction history.
#[tauri::command]
fn list_inventory_transactions(
    app: AppHandle,
) -> Result<Vec<InventoryTransaction>, String> {
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
        .transaction_with_behavior(
            rusqlite::TransactionBehavior::Immediate,
        )
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
        return Err(format!(
            "Insufficient stock. Available: {current_stock}"
        ));
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
fn list_production_entries(
    app: AppHandle,
) -> Result<Vec<ProductionEntry>, String> {
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

    validate_production_quantity(
        &connection,
        &order_id,
        &stage,
        completed_quantity,
        None,
    )?;

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
fn delete_production_entry(
    app: AppHandle,
    id: String,
) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let changed = connection
        .execute(
            "DELETE FROM production_entries WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Production entry not found.".into());
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            initialize_database(&app.handle())
                .map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
    list_orders,
    create_order,
    update_order,
    delete_order,
    list_materials,
    create_material,
    update_material,
    delete_material,
    list_inventory_transactions,
    create_inventory_transaction,
    list_production_entries,
    create_production_entry,
    update_production_entry,
    delete_production_entry
])
        .run(tauri::generate_context!())
        .expect("error while running OrderFit");
}
