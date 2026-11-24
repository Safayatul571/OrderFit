
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus, Pencil, Trash2, Search, RefreshCw, X,
  Scissors, Shirt, Sparkles, ShieldCheck,
  TrendingUp, Package, Activity, AlertCircle,
  CheckCircle2, Clock3, ArrowUpRight, Factory,
} from "lucide-react";

type ProductionOrder = {
  id: string;
  buyer: string;
  product: string;
  quantity: string;
  due: string;
  progress: number;
  status: string;
};

type ProductionEntry = {
  id: string;
  order_id: string;
  stage: string;
  completed_quantity: number;
  production_date: string;
  notes: string;
  created_at: string;
};

type ProductionForm = {
  orderId: string;
  stage: string;
  completedQuantity: string;
  productionDate: string;
  notes: string;
};

type Props = { orders: ProductionOrder[] };

const STAGES = ["Cutting", "Sewing", "Finishing", "QC"];

const STAGE_ICONS = {
  Cutting: Scissors,
  Sewing: Shirt,
  Finishing: Sparkles,
  QC: ShieldCheck,
};

const STAGE_COLORS = {
  Cutting: "cutting",
  Sewing: "sewing",
  Finishing: "finishing",
  QC: "qc",
};

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getOrderQuantity(quantity: string) {
  const match = quantity.trim().match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatDate(value: string) {
  if (!value) return "â€”";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function emptyForm(orderId = ""): ProductionForm {
  return {
    orderId,
    stage: "Cutting",
    completedQuantity: "",
    productionDate: todayLocal(),
    notes: "",
  };
}

export default function Production({ orders }: Props) {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);
  const [form, setForm] = useState<ProductionForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<ProductionEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadEntries() {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<ProductionEntry[]>("list_production_entries");
      setEntries(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  const orderMap = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders]
  );

  const totalTarget = useMemo(
    () => orders.reduce((sum, order) => sum + getOrderQuantity(order.quantity), 0),
    [orders]
  );

  const totalProduced = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.completed_quantity, 0),
    [entries]
  );

  const todayProduced = useMemo(
    () => entries
      .filter((entry) => entry.production_date === todayLocal())
      .reduce((sum, entry) => sum + entry.completed_quantity, 0),
    [entries]
  );

  const stageTotals = useMemo(() => {
    return Object.fromEntries(
      STAGES.map((stage) => [
        stage,
        entries
          .filter((entry) => entry.stage === stage)
          .reduce((sum, entry) => sum + entry.completed_quantity, 0),
      ])
    ) as Record<string, number>;
  }, [entries]);

  const qcOutput = stageTotals.QC ?? 0;
  const remainingQuantity = Math.max(0, totalTarget - qcOutput);
  const overallProgress = totalTarget > 0
    ? Math.min(100, (qcOutput / totalTarget) * 100)
    : 0;

  const activeOrders = useMemo(
    () => orders.filter((order) => {
      const hasProduction = entries.some((entry) => entry.order_id === order.id);
      const qcDone = getStageTotal(order.id, "QC");
      return hasProduction && qcDone < getOrderQuantity(order.quantity);
    }),
    [orders, entries]
  );

  function getStageTotal(orderId: string, stage: string) {
    return entries
      .filter((entry) => entry.order_id === orderId && entry.stage === stage)
      .reduce((sum, entry) => sum + entry.completed_quantity, 0);
  }

  const orderProgress = useMemo(() => {
    return orders.map((order) => {
      const target = getOrderQuantity(order.quantity);
      const stages = Object.fromEntries(
        STAGES.map((stage) => [stage, getStageTotal(order.id, stage)])
      ) as Record<string, number>;

      const qc = stages.QC;
      const percent = target > 0 ? Math.min(100, (qc / target) * 100) : 0;

      return {
        order,
        target,
        stages,
        qc,
        remaining: Math.max(0, target - qc),
        percent,
        hasRecords: entries.some((entry) => entry.order_id === order.id),
      };
    });
  }, [orders, entries]);

  const attentionOrders = useMemo(
    () => orderProgress
      .filter((item) => item.hasRecords && item.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 5),
    [orderProgress]
  );

  const dailyTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

      return {
        key,
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        total: entries
          .filter((entry) => entry.production_date === key)
          .reduce((sum, entry) => sum + entry.completed_quantity, 0),
      };
    });

    return days;
  }, [entries]);

  const maxDailyOutput = Math.max(1, ...dailyTrend.map((day) => day.total));
  const weeklyOutput = dailyTrend.reduce((sum, day) => sum + day.total, 0);

  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => {
      const dateCompare = b.production_date.localeCompare(a.production_date);
      if (dateCompare !== 0) return dateCompare;
      return b.created_at.localeCompare(a.created_at);
    }).slice(0, 5),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const order = orderMap.get(entry.order_id);
      const matchesOrder = selectedOrder === "all" || entry.order_id === selectedOrder;
      const matchesStage = selectedStage === "all" || entry.stage === selectedStage;
      const matchesSearch =
        !query ||
        entry.order_id.toLowerCase().includes(query) ||
        (order?.buyer ?? "").toLowerCase().includes(query) ||
        (order?.product ?? "").toLowerCase().includes(query) ||
        entry.stage.toLowerCase().includes(query);

      return matchesOrder && matchesStage && matchesSearch;
    }).sort((a, b) => b.production_date.localeCompare(a.production_date));
  }, [entries, orderMap, selectedOrder, selectedStage, search]);

  function openCreateModal() {
    setError("");
    setEditingEntry(null);
    setForm(emptyForm(orders[0]?.id ?? ""));
    setModalOpen(true);
  }

  function openEditModal(entry: ProductionEntry) {
    setError("");
    setEditingEntry(entry);
    setForm({
      orderId: entry.order_id,
      stage: entry.stage,
      completedQuantity: String(entry.completed_quantity),
      productionDate: entry.production_date,
      notes: entry.notes ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingEntry(null);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const quantity = Number(form.completedQuantity);

    if (!form.orderId) {
      setError("Please select an order.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Completed quantity must be a positive whole number.");
      return;
    }
    if (!form.productionDate) {
      setError("Production date is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingEntry) {
        await invoke("update_production_entry", {
          id: editingEntry.id,
          orderId: form.orderId,
          stage: form.stage,
          completedQuantity: quantity,
          productionDate: form.productionDate,
          notes: form.notes,
        });
      } else {
        await invoke("create_production_entry", {
          orderId: form.orderId,
          stage: form.stage,
          completedQuantity: quantity,
          productionDate: form.productionDate,
          notes: form.notes,
        });
      }

      setModalOpen(false);
      setEditingEntry(null);
      await loadEntries();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteEntry || deleting) return;
    setDeleting(true);
    setError("");

    try {
      await invoke("delete_production_entry", { id: deleteEntry.id });
      setDeleteEntry(null);
      await loadEntries();
    } catch (err) {
      setError(String(err));
    } finally {
      setDeleting(false);
    }
  }

  const selectedOrderData = orders.find((order) => order.id === form.orderId) ?? null;
  const targetQuantity = selectedOrderData
    ? getOrderQuantity(selectedOrderData.quantity)
    : 0;
  const existingStageQuantity = selectedOrderData
    ? getStageTotal(selectedOrderData.id, form.stage)
    : 0;
  const editingStageQuantity = editingEntry?.completed_quantity ?? 0;
  const remainingForStage = Math.max(
    0,
    targetQuantity - existingStageQuantity + editingStageQuantity
  );

  return (
    <section className="module-panel production-module production-control-center">
      <div className="production-header">
        <div>
          <div className="production-eyebrow">
            <span className="production-live-dot" />
            OPERATIONS / PRODUCTION
          </div>
          <h2>Production Control Center</h2>
          <p>Monitor output, track order progress and understand your production pipeline.</p>
        </div>
        <div className="production-header-actions">
          <button className="button button-secondary" type="button" onClick={() => void loadEntries()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "production-spinning" : ""} />
            Refresh
          </button>
          <button className="button button-primary" type="button" onClick={openCreateModal} disabled={orders.length === 0}>
            <Plus size={16} /> Add Production
          </button>
        </div>
      </div>

      {error && !modalOpen && <div className="production-error"><AlertCircle size={16} />{error}</div>}

      {loading && entries.length === 0 ? (
        <div className="production-loading">
          <RefreshCw size={20} className="production-spinning" />
          <span>Loading production intelligence...</span>
        </div>
      ) : (
        <>
          <div className="production-health-panel">
            <div className="production-health-main">
              <div className="production-health-label">
                <Activity size={15} /> PRODUCTION HEALTH
              </div>
              <h3>Overall QC Completion</h3>
              <div className="production-health-number">
                {overallProgress.toFixed(1)}<span>%</span>
              </div>
              <div className="production-health-track">
                <div style={{ width: `${overallProgress}%` }} />
              </div>
              <div className="production-health-foot">
                <span><strong>{formatNumber(qcOutput)}</strong> pcs QC recorded</span>
                <span>{formatNumber(remainingQuantity)} pcs remaining</span>
              </div>
            </div>
            <div className="production-health-side">
              <div className="production-health-stat">
                <span>Total order quantity</span>
                <strong>{formatNumber(totalTarget)} <small>pcs</small></strong>
              </div>
              <div className="production-health-stat">
                <span>Recorded across all stages</span>
                <strong>{formatNumber(totalProduced)} <small>pcs</small></strong>
              </div>
              <div className="production-health-stat">
                <span>Orders with production records</span>
                <strong>{activeOrders.length} <small>orders</small></strong>
              </div>
            </div>
          </div>

          <div className="production-kpi-grid">
            <div className="production-kpi-card">
              <div className="production-kpi-icon violet"><Package size={18} /></div>
              <span>Total Orders</span>
              <strong>{orders.length}</strong>
              <small>Orders in the system</small>
            </div>
            <div className="production-kpi-card">
              <div className="production-kpi-icon blue"><TrendingUp size={18} /></div>
              <span>Today's Output</span>
              <strong>{formatNumber(todayProduced)}</strong>
              <small>Pieces recorded today</small>
            </div>
            <div className="production-kpi-card">
              <div className="production-kpi-icon green"><CheckCircle2 size={18} /></div>
              <span>QC Output</span>
              <strong>{formatNumber(qcOutput)}</strong>
              <small>Pieces recorded at QC</small>
            </div>
            <div className="production-kpi-card">
              <div className="production-kpi-icon orange"><Clock3 size={18} /></div>
              <span>Pending QC Quantity</span>
              <strong>{formatNumber(remainingQuantity)}</strong>
              <small>Based on total order quantity</small>
            </div>
          </div>

          <div className="production-section-block">
            <div className="production-section-title">
              <div>
                <span className="production-section-kicker">WORKFLOW OVERVIEW</span>
                <h3>Production Pipeline</h3>
                <p>Compare recorded quantities across each production stage.</p>
              </div>
              <span className="production-section-meta">{STAGES.length} stages</span>
            </div>

            <div className="production-pipeline">
              {STAGES.map((stage, index) => {
                const Icon = STAGE_ICONS[stage as keyof typeof STAGE_ICONS];
                const total = stageTotals[stage] ?? 0;
                const percent = totalTarget > 0 ? Math.min(100, (total / totalTarget) * 100) : 0;

                return (
                  <div className={`production-pipeline-card ${STAGE_COLORS[stage as keyof typeof STAGE_COLORS]}`} key={stage}>
                    <div className="production-pipeline-top">
                      <div className="production-pipeline-icon"><Icon size={18} /></div>
                      <span className="production-pipeline-number">0{index + 1}</span>
                    </div>
                    <span className="production-pipeline-name">{stage}</span>
                    <strong>{formatNumber(total)} <small>pcs</small></strong>
                    <div className="production-pipeline-track">
                      <div style={{ width: `${percent}%` }} />
                    </div>
                    <div className="production-pipeline-bottom">
                      <span>{percent.toFixed(1)}% of order qty</span>
                      <span>{totalTarget > 0 ? `${formatNumber(Math.max(0, totalTarget - total))} left` : "No target"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="production-pipeline-note">
              <Activity size={15} />
              <span>Stage totals show recorded output. They are not added together to calculate finished goods, because the same pieces may pass through multiple stages.</span>
            </div>
          </div>

          <div className="production-insight-grid">
            <div className="production-content-card production-trend-card">
              <div className="production-card-heading">
                <div>
                  <span className="production-section-kicker">OUTPUT ANALYTICS</span>
                  <h3>Daily Production Trend</h3>
                  <p>Recorded production across the last 7 days.</p>
                </div>
                <div className="production-trend-total">
                  <strong>{formatNumber(weeklyOutput)}</strong>
                  <span>pcs / 7 days</span>
                </div>
              </div>
              <div className="production-chart">
                {dailyTrend.map((day) => {
                  const height = day.total > 0 ? Math.max(7, (day.total / maxDailyOutput) * 100) : 3;
                  return (
                    <div className="production-chart-column" key={day.key}>
                      <span className="production-chart-value">{day.total ? formatNumber(day.total) : "â€”"}</span>
                      <div className="production-chart-bar-area">
                        <div className={day.key === todayLocal() ? "production-chart-bar today" : "production-chart-bar"} style={{ height: `${height}%` }} />
                      </div>
                      <span className="production-chart-day">{day.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="production-chart-caption">Daily totals combine all recorded production stages.</div>
            </div>

            <div className="production-content-card production-attention-card">
              <div className="production-card-heading">
                <div>
                  <span className="production-section-kicker">ORDER MONITOR</span>
                  <h3>Remaining Workload</h3>
                  <p>Orders with production records and outstanding QC quantity.</p>
                </div>
                <ArrowUpRight size={17} />
              </div>
              {attentionOrders.length === 0 ? (
                <div className="production-empty">
                  <CheckCircle2 size={22} />
                  <strong>No outstanding recorded orders</strong>
                  <span>There are no recorded orders with remaining QC quantity.</span>
                </div>
              ) : (
                <div className="production-attention-list">
                  {attentionOrders.map((item) => (
                    <div className="production-attention-row" key={item.order.id}>
                      <div className="production-attention-order">
                        <strong>{item.order.id}</strong>
                        <span>{item.order.product}</span>
                      </div>
                      <div className="production-attention-quantity">
                        <strong>{formatNumber(item.remaining)}</strong>
                        <span>pcs remaining</span>
                      </div>
                      <div className="production-mini-track">
                        <div style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="production-insight-foot">
                <AlertCircle size={13} />
                <span>Remaining quantity is based on QC output, not a delivery-risk prediction.</span>
              </div>
            </div>
          </div>

          <div className="production-section-block">
            <div className="production-section-title">
              <div>
                <span className="production-section-kicker">ORDER LEVEL MONITORING</span>
                <h3>Order Production Progress</h3>
                <p>Compare each order's recorded quantity across all four stages.</p>
              </div>
              <span className="production-section-meta">{orders.length} orders</span>
            </div>

            {orders.length === 0 ? (
              <div className="production-empty">No orders available. Create an order first.</div>
            ) : (
              <div className="production-order-grid">
                {orderProgress.map((item) => (
                  <div className="production-order-card" key={item.order.id}>
                    <div className="production-order-card-head">
                      <div>
                        <span className="production-order-id">{item.order.id}</span>
                        <h4>{item.order.product}</h4>
                        <p>{item.order.buyer}</p>
                      </div>
                      <span className={`production-order-status ${item.percent >= 100 ? "complete" : item.hasRecords ? "progress" : "waiting"}`}>
                        {item.percent >= 100 ? "QC Complete" : item.hasRecords ? "In Progress" : "Not Started"}
                      </span>
                    </div>
                    <div className="production-order-total">
                      <strong>{formatNumber(item.qc)} <small>/ {formatNumber(item.target)} pcs QC</small></strong>
                      <span>{item.percent.toFixed(0)}%</span>
                    </div>
                    <div className="production-order-main-track">
                      <div style={{ width: `${item.percent}%` }} />
                    </div>
                    <div className="production-order-stage-list">
                      {STAGES.map((stage) => {
                        const amount = item.stages[stage];
                        const percent = item.target > 0 ? Math.min(100, (amount / item.target) * 100) : 0;
                        return (
                          <div className="production-order-stage" key={stage}>
                            <div><span>{stage}</span><strong>{formatNumber(amount)}</strong></div>
                            <div className="production-order-stage-track"><div style={{ width: `${percent}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="production-order-card-foot">
                      <span>QC remaining</span>
                      <strong>{formatNumber(item.remaining)} pcs</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="production-content-card production-recent-card">
            <div className="production-card-heading">
              <div>
                <span className="production-section-kicker">LATEST UPDATES</span>
                <h3>Recent Production Activity</h3>
                <p>Latest five production records.</p>
              </div>
              <Activity size={18} />
            </div>
            {recentEntries.length === 0 ? (
              <div className="production-empty">No production activity recorded yet.</div>
            ) : (
              <div className="production-recent-list">
                {recentEntries.map((entry) => {
                  const order = orderMap.get(entry.order_id);
                  return (
                    <div className="production-recent-row" key={entry.id}>
                      <div className={`production-recent-icon ${STAGE_COLORS[entry.stage as keyof typeof STAGE_COLORS] ?? ""}`}>
                        <Factory size={16} />
                      </div>
                      <div className="production-recent-copy">
                        <strong>{entry.stage} production recorded</strong>
                        <span>{entry.order_id} Â· {order?.product ?? "Order unavailable"}</span>
                      </div>
                      <div className="production-recent-amount">
                        <strong>+{formatNumber(entry.completed_quantity)}</strong>
                        <span>pcs</span>
                      </div>
                      <time>{formatDate(entry.production_date)}</time>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="production-section-block production-history">
            <div className="production-section-title">
              <div>
                <span className="production-section-kicker">PRODUCTION RECORDS</span>
                <h3>Production History</h3>
                <p>Search, filter, edit and manage production entries.</p>
              </div>
              <span className="production-section-meta">{filteredEntries.length} records</span>
            </div>

            <div className="production-filters">
              <div className="production-search">
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, buyer or product..." />
              </div>
              <select value={selectedOrder} onChange={(event) => setSelectedOrder(event.target.value)}>
                <option value="all">All Orders</option>
                {orders.map((order) => <option value={order.id} key={order.id}>{order.id} â€” {order.product}</option>)}
              </select>
              <select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)}>
                <option value="all">All Stages</option>
                {STAGES.map((stage) => <option value={stage} key={stage}>{stage}</option>)}
              </select>
            </div>

            <div className="table-wrap production-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DATE</th><th>ORDER</th><th>PRODUCT</th><th>STAGE</th>
                    <th>COMPLETED QTY</th><th>NOTES</th><th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr><td colSpan={7} className="empty-row">{loading ? "Loading records..." : "No production records found."}</td></tr>
                  ) : filteredEntries.map((entry) => {
                    const order = orderMap.get(entry.order_id);
                    return (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.production_date)}</td>
                        <td><strong className="production-table-order">{entry.order_id}</strong></td>
                        <td>{order?.product ?? "Order unavailable"}</td>
                        <td><span className={`production-stage-badge ${STAGE_COLORS[entry.stage as keyof typeof STAGE_COLORS] ?? ""}`}>{entry.stage}</span></td>
                        <td><strong>{formatNumber(entry.completed_quantity)} pcs</strong></td>
                        <td className="production-notes-cell">{entry.notes || "â€”"}</td>
                        <td>
                          <div className="production-row-actions">
                            <button type="button" className="production-icon-button" title="Edit entry" onClick={() => openEditModal(entry)}><Pencil size={15} /></button>
                            <button type="button" className="production-icon-button danger" title="Delete entry" onClick={() => setDeleteEntry(entry)}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="create-modal production-modal">
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">PRODUCTION RECORD</span>
                <h2>{editingEntry ? "Edit Production Entry" : "Add Production Entry"}</h2>
                <p>Enter the completed quantity for an order stage.</p>
              </div>
              <button className="production-icon-button" type="button" onClick={closeModal} disabled={saving}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="production-form">
              <label>Order
                <select required value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })}>
                  <option value="">Select order</option>
                  {orders.map((order) => <option value={order.id} key={order.id}>{order.id} â€” {order.product} ({order.quantity})</option>)}
                </select>
              </label>
              <label>Production Stage
                <select required value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
                  {STAGES.map((stage) => <option value={stage} key={stage}>{stage}</option>)}
                </select>
              </label>
              <div className="production-remaining-info">
                <span>Remaining capacity for this stage</span>
                <strong>{formatNumber(remainingForStage)} pcs</strong>
              </div>
              <label>Completed Quantity (pcs)
                <input type="number" min="1" max={remainingForStage} step="1" required value={form.completedQuantity} onChange={(event) => setForm({ ...form, completedQuantity: event.target.value })} placeholder="Enter completed quantity" />
              </label>
              <label>Production Date
                <input type="date" required value={form.productionDate} onChange={(event) => setForm({ ...form, productionDate: event.target.value })} />
              </label>
              <label>Notes (optional)
                <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add production notes..." />
              </label>
              {error && <div className="production-error"><AlertCircle size={15} />{error}</div>}
              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={closeModal} disabled={saving}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={saving || orders.length === 0}>{saving ? "Saving..." : editingEntry ? "Update Entry" : "Save Production"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteEntry && (
        <div className="modal-backdrop">
          <div className="create-modal production-delete-modal">
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">CONFIRM DELETE</span>
                <h2>Delete Production Entry?</h2>
                <p>This action permanently removes the selected record.</p>
              </div>
            </div>
            <div className="production-delete-summary">
              <strong>{deleteEntry.order_id}</strong>
              <span>{deleteEntry.stage} Â· {formatNumber(deleteEntry.completed_quantity)} pcs Â· {formatDate(deleteEntry.production_date)}</span>
            </div>
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setDeleteEntry(null)} disabled={deleting}>Cancel</button>
              <button className="button button-primary production-delete-button" type="button" onClick={() => void handleDelete()} disabled={deleting}>{deleting ? "Deleting..." : "Delete Entry"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


