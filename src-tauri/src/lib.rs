
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

fn database_connection(app: &AppHandle) -> Result<Connection, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    std::fs::create_dir_all(&directory)
        .map_err(|e| e.to_string())?;

    let database_path = directory.join("orderfit.db");

    Connection::open(database_path)
        .map_err(|e| e.to_string())
}

fn initialize_database(app: &AppHandle) -> Result<(), String> {
    let connection = database_connection(app)?;

    connection.execute(
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
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn list_orders(app: AppHandle) -> Result<Vec<Order>, String> {
    let connection = database_connection(&app)?;

    let mut statement = connection
        .prepare(
            "SELECT id, buyer, product, quantity, due, progress, status
             FROM orders ORDER BY rowid DESC"
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

    connection.execute(
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
    ).map_err(|e| e.to_string())?;

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

    let changed = connection.execute(
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
    ).map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Order not found.".into());
    }

    Ok(())
}

#[tauri::command]
fn delete_order(app: AppHandle, id: String) -> Result<(), String> {
    let connection = database_connection(&app)?;

    let changed = connection.execute(
        "DELETE FROM orders WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;

    if changed == 0 {
        return Err("Order not found.".into());
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
            delete_order
        ])
        .run(tauri::generate_context!())
        .expect("error while running OrderFit");
}
