import { useEffect, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type Material = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  current_stock: number;
};

type InventoryTransaction = {
  id: string;
  material_id: string;
  material_name: string;
  sku: string;
  transaction_type: string;
  quantity_change: number;
  transaction_date: string;
  reference: string;
  notes: string;
  created_at: string;
};

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function InventoryTransactions({
  onChanged,
}: {
  onChanged?: () => void;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [transactionType, setTransactionType] = useState("Stock In");
  const [quantity, setQuantity] = useState("");
  const [transactionDate, setTransactionDate] = useState(getLocalDate());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [materialResult, transactionResult] = await Promise.all([
        invoke<Material[]>("list_materials"),
        invoke<InventoryTransaction[]>("list_inventory_transactions"),
      ]);

      setMaterials(materialResult);
      setTransactions(transactionResult);

      if (
        !materialId ||
        !materialResult.some((material) => material.id === materialId)
      ) {
        setMaterialId(materialResult[0]?.id ?? "");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedMaterial = materials.find(
    (material) => material.id === materialId
  );

  const saveTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(quantity);

    if (!materialId) {
      setError("Please select a material.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (!transactionDate) {
      setError("Transaction date is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await invoke("create_inventory_transaction", {
        materialId,
        transactionType,
        quantity: amount,
        transactionDate,
        reference: reference.trim(),
        notes: notes.trim(),
      });

      setSuccess(`${transactionType} transaction saved successfully.`);
      setQuantity("");
      setReference("");
      setNotes("");

      await loadData();
      onChanged?.();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-transactions">
      <section className="panel inventory-transaction-panel">
        <div className="materials-list-heading">
          <div>
            <h2>Stock movement</h2>
            <p>Record incoming and outgoing material quantities.</p>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="materials-message error">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="materials-message success">
            <CheckCircle2 size={15} />
            <span>{success}</span>
          </div>
        )}

        <form className="inventory-transaction-form" onSubmit={saveTransaction}>
          <label>
            Transaction type
            <select
              value={transactionType}
              onChange={(event) => setTransactionType(event.target.value)}
            >
              <option>Stock In</option>
              <option>Stock Out</option>
            </select>
          </label>

          <label>
            Material
            <select
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
              required
              disabled={loading || materials.length === 0}
            >
              {materials.length === 0 ? (
                <option value="">No materials available</option>
              ) : (
                materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.sku})
                  </option>
                ))
              )}
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              min="0.0001"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Enter quantity"
              required
            />
          </label>

          <label>
            Transaction date
            <input
              type="date"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              required
            />
          </label>

          <label>
            Reference
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Invoice / issue reference"
            />
          </label>

          <label>
            Notes
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes"
            />
          </label>

          {selectedMaterial && (
            <div className="inventory-current-stock">
              Current stock:
              <strong>
                {selectedMaterial.current_stock.toLocaleString()}{" "}
                {selectedMaterial.unit}
              </strong>
            </div>
          )}

          <button
            className="button button-primary inventory-submit"
            type="submit"
            disabled={saving || loading || materials.length === 0}
          >
            {transactionType === "Stock In" ? (
              <ArrowDownToLine size={15} />
            ) : (
              <ArrowUpFromLine size={15} />
            )}
            {saving ? "Saving..." : `Record ${transactionType}`}
          </button>
        </form>
      </section>

      <section className="panel inventory-history-panel">
        <div className="materials-list-heading">
          <div>
            <h2>Transaction history</h2>
            <p>Recent stock movements across all materials.</p>
          </div>
          <span className="materials-record-count">
            {transactions.length} records
          </span>
        </div>

        {loading ? (
          <div className="materials-loading">
            <RefreshCw size={18} className="production-spinning" />
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="materials-loading">
            No inventory transactions recorded yet.
          </div>
        ) : (
          <div className="table-wrap materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>MATERIAL</th>
                  <th>TYPE</th>
                  <th>QUANTITY</th>
                  <th>REFERENCE</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.transaction_date}</td>
                    <td>
                      <div className="materials-name-cell">
                        <strong>{transaction.material_name}</strong>
                      </div>
                      <span className="materials-sku">{transaction.sku}</span>
                    </td>
                    <td>
                      <span
                        className={`inventory-transaction-type ${
                          transaction.transaction_type === "Stock In"
                            ? "stock-in"
                            : transaction.transaction_type === "Stock Out"
                              ? "stock-out"
                              : "adjustment"
                        }`}
                      >
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td>
                      <strong
                        className={
                          transaction.quantity_change < 0
                            ? "inventory-quantity-negative"
                            : "inventory-quantity-positive"
                        }
                      >
                        {transaction.quantity_change > 0 ? "+" : ""}
                        {transaction.quantity_change.toLocaleString()}
                      </strong>
                    </td>
                    <td>{transaction.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
