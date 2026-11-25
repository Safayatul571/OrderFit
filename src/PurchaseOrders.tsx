import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus, Search, RefreshCw, AlertTriangle, CheckCircle2, X,
  ClipboardList, Package, Truck, CalendarDays, Eye,
  ArrowDownToLine, Clock, FileText,
} from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at: string;
};

type Material = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  minimum_stock: number;
  current_stock: number;
  notes: string;
  created_at: string;
};

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  order_date: string;
  expected_delivery_date: string;
  status: string;
  notes: string;
  total_amount: number;
  created_at: string;
};

type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  material_id: string;
  material_name: string;
  sku: string;
  unit: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_price: number;
  subtotal: number;
};

type PurchaseOrderReceipt = {
  id: string;
  purchase_order_item_id: string;
  material_id: string;
  material_name: string;
  quantity_received: number;
  receipt_date: string;
  inventory_transaction_id: string;
  notes: string;
  created_at: string;
};

type DraftItem = {
  materialId: string;
  quantity: string;
  unitPrice: string;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = (value: number) =>
  `৳${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const emptyDraftItem = (): DraftItem => ({
  materialId: "",
  quantity: "",
  unitPrice: "",
});

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [receipts, setReceipts] = useState<PurchaseOrderReceipt[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [receivingItem, setReceivingItem] = useState<PurchaseOrderItem | null>(null);
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [receiveDate, setReceiveDate] = useState(today());
  const [receiveNotes, setReceiveNotes] = useState("");

  const [form, setForm] = useState({
    poNumber: "",
    supplierId: "",
    orderDate: today(),
    expectedDeliveryDate: "",
    notes: "",
  });
  const [draftItems, setDraftItems] = useState<DraftItem[]>([emptyDraftItem()]);

  const selectedOrder = orders.find((order) => order.id === selectedId) ?? null;

  const loadDetails = async (id: string) => {
    try {
      const [itemResult, receiptResult] = await Promise.all([
        invoke<PurchaseOrderItem[]>("list_purchase_order_items", {
          purchaseOrderId: id,
        }),
        invoke<PurchaseOrderReceipt[]>("list_purchase_order_receipts", {
          purchaseOrderId: id,
        }),
      ]);
      setItems(itemResult);
      setReceipts(receiptResult);
    } catch (err) {
      setError(String(err));
    }
  };

  const loadData = async (preferredId?: string) => {
    try {
      setLoading(true);
      setError("");

      const [orderResult, supplierResult, materialResult] = await Promise.all([
        invoke<PurchaseOrder[]>("list_purchase_orders"),
        invoke<Supplier[]>("list_suppliers"),
        invoke<Material[]>("list_materials"),
      ]);

      setOrders(orderResult);
      setSuppliers(supplierResult);
      setMaterials(materialResult);

      const nextId =
        preferredId ||
        (orderResult.some((order) => order.id === selectedId)
          ? selectedId
          : orderResult[0]?.id ?? "");

      setSelectedId(nextId);

      if (nextId) {
        const [itemResult, receiptResult] = await Promise.all([
          invoke<PurchaseOrderItem[]>("list_purchase_order_items", {
            purchaseOrderId: nextId,
          }),
          invoke<PurchaseOrderReceipt[]>("list_purchase_order_receipts", {
            purchaseOrderId: nextId,
          }),
        ]);
        setItems(itemResult);
        setReceipts(receiptResult);
      } else {
        setItems([]);
        setReceipts([]);
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

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = [
        order.po_number,
        order.supplier_name,
        order.status,
      ].some((value) => value.toLowerCase().includes(search));

      return matchesSearch && (filter === "All" || order.status === filter);
    });
  }, [orders, query, filter]);

  const openCreate = () => {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const datePart = today().replace(/-/g, "");
    setForm({
      poNumber: `PO-${datePart}-${suffix}`,
      supplierId: suppliers[0]?.id ?? "",
      orderDate: today(),
      expectedDeliveryDate: "",
      notes: "",
    });
    setDraftItems([emptyDraftItem()]);
    setError("");
    setShowCreate(true);
  };

  const updateDraftItem = (
    index: number,
    field: keyof DraftItem,
    value: string
  ) => {
    setDraftItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const draftTotal = draftItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  const savePurchaseOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.supplierId) {
      setError("Please select a supplier.");
      return;
    }

    const validItems = draftItems.filter(
      (item) => item.materialId && Number(item.quantity) > 0 &&
        Number.isFinite(Number(item.quantity)) &&
        Number(item.unitPrice) >= 0 &&
        Number.isFinite(Number(item.unitPrice))
    );

    if (validItems.length === 0) {
      setError("Add at least one valid material line item.");
      return;
    }

    if (new Set(validItems.map((item) => item.materialId)).size !== validItems.length) {
      setError("A material can only appear once in a purchase order.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await invoke("create_purchase_order", {
        poNumber: form.poNumber.trim(),
        supplierId: form.supplierId,
        orderDate: form.orderDate,
        expectedDeliveryDate: form.expectedDeliveryDate,
        notes: form.notes.trim(),
        items: validItems.map((item) => ({
          material_id: item.materialId,
          ordered_quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice),
        })),
      });

      setShowCreate(false);
      setSuccess("Purchase order created successfully.");
      await loadData();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selectedOrder) return;

    const message =
      status === "Cancelled"
        ? `Cancel purchase order ${selectedOrder.po_number}?`
        : `Change ${selectedOrder.po_number} status to ${status}?`;

    if (!window.confirm(message)) return;

    try {
      setError("");
      await invoke("update_purchase_order_status", {
        purchaseOrderId: selectedOrder.id,
        status,
      });
      setSuccess(`Purchase order status updated to ${status}.`);
      await loadData(selectedOrder.id);
    } catch (err) {
      setError(String(err));
    }
  };

  const openReceive = (item: PurchaseOrderItem) => {
    setReceivingItem(item);
    setReceiveQuantity(String(item.ordered_quantity - item.received_quantity));
    setReceiveDate(today());
    setReceiveNotes("");
    setError("");
  };

  const receiveMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!receivingItem || !selectedOrder) return;

    const quantity = Number(receiveQuantity);
    const remaining = receivingItem.ordered_quantity - receivingItem.received_quantity;

    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > remaining) {
      setError(`Enter a quantity greater than zero and no more than ${remaining}.`);
      return;
    }

    try {
      setSaving(true);
      setError("");

      await invoke("receive_purchase_order_item", {
        receiptId: crypto.randomUUID(),
        purchaseOrderItemId: receivingItem.id,
        quantityReceived: quantity,
        receiptDate: receiveDate,
        notes: receiveNotes.trim(),
      });

      setReceivingItem(null);
      setSuccess("Material received. Inventory stock was updated automatically.");
      await loadData(selectedOrder.id);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const totalOrdered = orders.length;
  const pendingCount = orders.filter((o) => ["Pending", "Ordered", "Partially Received"].includes(o.status)).length;
  const receivedCount = orders.filter((o) => o.status === "Received").length;
  const totalValue = orders.reduce((sum, order) => sum + order.total_amount, 0);

  const statusClass = (status: string) =>
    status.toLowerCase().replace(/ /g, "-");

  return (
    <div className="materials-module po-module">
      <div className="materials-header">
        <div>
          <h2>Purchase order overview</h2>
          <p>Create supplier orders, receive materials and track purchasing activity.</p>
        </div>
        <div className="materials-header-actions">
          <button className="button button-secondary" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="button button-primary" onClick={openCreate} disabled={suppliers.length === 0 || materials.length === 0}>
            <Plus size={16} /> Create purchase order
          </button>
        </div>
      </div>

      {error && (
        <div className="materials-message error">
          <AlertTriangle size={15} /><span>{error}</span>
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="materials-message success">
          <CheckCircle2 size={15} /><span>{success}</span>
          <button onClick={() => setSuccess("")}><X size={14} /></button>
        </div>
      )}

      {(suppliers.length === 0 || materials.length === 0) && !loading && (
        <div className="materials-message error">
          <AlertTriangle size={15} />
          <span>
            {suppliers.length === 0
              ? "Add a supplier before creating a purchase order."
              : "Add materials before creating a purchase order."}
          </span>
        </div>
      )}

      <div className="materials-metrics">
        <div className="materials-metric">
          <div className="materials-metric-icon violet"><ClipboardList size={18} /></div>
          <span>Total purchase orders</span><strong>{totalOrdered}</strong>
          <small>All recorded orders</small>
        </div>
        <div className="materials-metric">
          <div className="materials-metric-icon orange"><Clock size={18} /></div>
          <span>Active orders</span><strong>{pendingCount}</strong>
          <small>Pending, ordered or partial</small>
        </div>
        <div className="materials-metric">
          <div className="materials-metric-icon green"><Package size={18} /></div>
          <span>Received orders</span><strong>{receivedCount}</strong>
          <small>Fully received</small>
        </div>
        <div className="materials-metric">
          <div className="materials-metric-icon blue"><Truck size={18} /></div>
          <span>Total order value</span><strong className="po-value">{money(totalValue)}</strong>
          <small>Across all purchase orders</small>
        </div>
      </div>

      <section className="panel materials-list-panel">
        <div className="materials-list-heading">
          <div>
            <h2>Purchase order register</h2>
            <p>Search and review supplier purchase orders.</p>
          </div>
          <span className="materials-record-count">{filteredOrders.length} records</span>
        </div>

        <div className="materials-toolbar">
          <div className="materials-search">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search PO number, supplier or status..." />
          </div>
          <div className="filter-tabs po-filter-tabs">
            {["All", "Draft", "Pending", "Ordered", "Partially Received", "Received", "Cancelled"].map((status) => (
              <button key={status} className={filter === status ? "selected" : ""} onClick={() => setFilter(status)}>
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="materials-loading"><RefreshCw size={18} className="production-spinning" /> Loading purchase orders...</div>
        ) : (
          <div className="table-wrap materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PO NUMBER</th><th>SUPPLIER</th><th>ORDER DATE</th>
                  <th>EXPECTED DELIVERY</th><th>ORDER VALUE</th><th>STATUS</th><th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={7} className="empty-row">
                    {orders.length === 0 ? "No purchase orders yet. Create your first purchase order." : "No purchase orders match this filter."}
                  </td></tr>
                ) : filteredOrders.map((order) => (
                  <tr key={order.id} className={selectedId === order.id ? "po-selected-row" : ""}>
                    <td><strong className="order-id">{order.po_number}</strong></td>
                    <td><strong>{order.supplier_name}</strong></td>
                    <td>{order.order_date}</td>
                    <td>{order.expected_delivery_date || "—"}</td>
                    <td><strong>{money(order.total_amount)}</strong></td>
                    <td><span className={`po-status ${statusClass(order.status)}`}>{order.status}</span></td>
                    <td>
                      <button className="more-button" title="View purchase order" onClick={() => {
                        setSelectedId(order.id);
                        void loadDetails(order.id);
                      }}><Eye size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedOrder && (
        <section className="panel po-detail-panel">
          <div className="materials-list-heading">
            <div>
              <span className="modal-kicker">PURCHASE ORDER DETAILS</span>
              <h2>{selectedOrder.po_number}</h2>
              <p>{selectedOrder.supplier_name} · Ordered {selectedOrder.order_date}</p>
            </div>
            <span className={`po-status ${statusClass(selectedOrder.status)}`}>{selectedOrder.status}</span>
          </div>

          <div className="po-detail-meta">
            <div><CalendarDays size={15} /><span>Expected delivery</span><strong>{selectedOrder.expected_delivery_date || "Not specified"}</strong></div>
            <div><FileText size={15} /><span>Order value</span><strong>{money(selectedOrder.total_amount)}</strong></div>
          </div>

          {selectedOrder.notes && <p className="po-notes">{selectedOrder.notes}</p>}

          <div className="po-action-row">
            {selectedOrder.status === "Draft" && (
              <button className="button button-primary" onClick={() => void changeStatus("Pending")}>Submit for approval</button>
            )}
            {selectedOrder.status === "Pending" && (
              <button className="button button-primary" onClick={() => void changeStatus("Ordered")}>Mark as ordered</button>
            )}
            {["Draft", "Pending", "Ordered"].includes(selectedOrder.status) && (
              <button className="button button-secondary po-cancel-button" onClick={() => void changeStatus("Cancelled")}>Cancel order</button>
            )}
          </div>

          <div className="materials-list-heading po-subheading">
            <div><h2>Material line items</h2><p>Receive all or part of each ordered material quantity.</p></div>
            <span className="materials-record-count">{items.length} items</span>
          </div>

          <div className="table-wrap materials-table-wrap">
            <table>
              <thead><tr><th>MATERIAL</th><th>ORDERED</th><th>RECEIVED</th><th>REMAINING</th><th>UNIT PRICE</th><th>SUBTOTAL</th><th>ACTION</th></tr></thead>
              <tbody>
                {items.map((item) => {
                  const remaining = Math.max(0, item.ordered_quantity - item.received_quantity);
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.material_name}</strong><small className="po-sku">{item.sku}</small></td>
                      <td>{item.ordered_quantity.toLocaleString()} {item.unit}</td>
                      <td><strong className="success-text">{item.received_quantity.toLocaleString()}</strong> {item.unit}</td>
                      <td>{remaining.toLocaleString()} {item.unit}</td>
                      <td>{money(item.unit_price)}</td>
                      <td>{money(item.subtotal)}</td>
                      <td>
                        {remaining > 0 && ["Pending", "Ordered", "Partially Received"].includes(selectedOrder.status) ? (
                          <button className="button button-secondary po-receive-button" onClick={() => openReceive(item)}>
                            <ArrowDownToLine size={13} /> Receive
                          </button>
                        ) : <span className="po-complete-label">{remaining === 0 ? "Complete" : "—"}</span>}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan={7} className="empty-row">No line items found.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="materials-list-heading po-subheading">
            <div><h2>Receiving history</h2><p>Every receipt is recorded as an inventory Stock In transaction.</p></div>
            <span className="materials-record-count">{receipts.length} receipts</span>
          </div>

          {receipts.length === 0 ? (
            <div className="po-empty-history">No materials received for this purchase order yet.</div>
          ) : (
            <div className="table-wrap materials-table-wrap">
              <table>
                <thead><tr><th>RECEIPT DATE</th><th>MATERIAL</th><th>QUANTITY RECEIVED</th><th>INVENTORY REFERENCE</th><th>NOTES</th></tr></thead>
                <tbody>{receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>{receipt.receipt_date}</td>
                    <td><strong>{receipt.material_name}</strong></td>
                    <td><strong className="success-text">+{receipt.quantity_received.toLocaleString()}</strong></td>
                    <td><span className="po-inventory-ref">{receipt.inventory_transaction_id}</span></td>
                    <td>{receipt.notes || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget && !saving) setShowCreate(false);
        }}>
          <form className="create-modal materials-modal po-create-modal" onSubmit={savePurchaseOrder}>
            <div className="modal-heading">
              <div><span className="modal-kicker">PROCUREMENT MANAGEMENT</span><h2>Create purchase order</h2><p>Enter supplier details and add material line items.</p></div>
              <button type="button" className="icon-button" onClick={() => setShowCreate(false)} disabled={saving}><X size={18} /></button>
            </div>

            <div className="materials-form-grid">
              <label>PO number *
                <input required value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} />
              </label>
              <label>Supplier *
                <select required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
              <label>Order date *
                <input type="date" required value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
              </label>
              <label>Expected delivery
                <input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })} />
              </label>
              <label className="materials-form-full">Notes
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional purchase order notes..." />
              </label>
            </div>

            <div className="po-line-heading"><div><strong>Material line items</strong><span>Add materials and their ordered quantities.</span></div>
              <button type="button" className="button button-secondary" onClick={() => setDraftItems([...draftItems, emptyDraftItem()])}><Plus size={14} /> Add line</button>
            </div>

            <div className="po-draft-lines">
              {draftItems.map((item, index) => (
                <div className="po-draft-line" key={index}>
                  <label>Material
                    <select required value={item.materialId} onChange={(e) => updateDraftItem(index, "materialId", e.target.value)}>
                      <option value="">Select material</option>
                      {materials.filter((material) => material.id === item.materialId || !draftItems.some((other, i) => i !== index && other.materialId === material.id)).map((material) => (
                        <option key={material.id} value={material.id}>{material.name} ({material.sku})</option>
                      ))}
                    </select>
                  </label>
                  <label>Quantity
                    <input type="number" min="0.0001" step="any" required value={item.quantity} onChange={(e) => updateDraftItem(index, "quantity", e.target.value)} placeholder="0" />
                  </label>
                  <label>Unit price
                    <input type="number" min="0" step="any" required value={item.unitPrice} onChange={(e) => updateDraftItem(index, "unitPrice", e.target.value)} placeholder="0.00" />
                  </label>
                  <button type="button" className="more-button po-remove-line" title="Remove line" disabled={draftItems.length === 1} onClick={() => setDraftItems(draftItems.filter((_, i) => i !== index))}><X size={15} /></button>
                </div>
              ))}
            </div>

            <div className="po-total-row"><span>Estimated total</span><strong>{money(draftTotal)}</strong></div>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={saving}>{saving ? "Creating..." : "Create purchase order"}</button>
            </div>
          </form>
        </div>
      )}

      {receivingItem && (
        <div className="modal-backdrop" onMouseDown={(e) => {
          if (e.target === e.currentTarget && !saving) setReceivingItem(null);
        }}>
          <form className="create-modal materials-modal po-receive-modal" onSubmit={receiveMaterial}>
            <div className="modal-heading">
              <div><span className="modal-kicker">MATERIAL RECEIVING</span><h2>Receive material</h2><p>{receivingItem.material_name} · {receivingItem.sku}</p></div>
              <button type="button" className="icon-button" onClick={() => setReceivingItem(null)} disabled={saving}><X size={18} /></button>
            </div>
            <div className="po-receive-summary">
              <div><span>Ordered</span><strong>{receivingItem.ordered_quantity.toLocaleString()} {receivingItem.unit}</strong></div>
              <div><span>Already received</span><strong>{receivingItem.received_quantity.toLocaleString()} {receivingItem.unit}</strong></div>
              <div><span>Remaining</span><strong>{(receivingItem.ordered_quantity - receivingItem.received_quantity).toLocaleString()} {receivingItem.unit}</strong></div>
            </div>
            <div className="materials-form-grid">
              <label className="materials-form-full">Quantity received *
                <input type="number" min="0.0001" max={receivingItem.ordered_quantity - receivingItem.received_quantity} step="any" required value={receiveQuantity} onChange={(e) => setReceiveQuantity(e.target.value)} />
              </label>
              <label className="materials-form-full">Receipt date *
                <input type="date" required value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} />
              </label>
              <label className="materials-form-full">Notes
                <textarea rows={2} value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} placeholder="Optional delivery or inspection notes..." />
              </label>
            </div>
            <p className="po-stock-notice"><CheckCircle2 size={15} /> Saving this receipt automatically adds the received quantity to inventory stock.</p>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setReceivingItem(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={saving}>{saving ? "Recording..." : "Confirm receipt"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}