import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  X,
  Factory,
  AlertCircle,
  ClipboardList,
} from "lucide-react";

type PlanningOrder = {
  id: string;
  buyer: string;
  product: string;
  quantity: string;
  due: string;
  progress: number;
  status: string;
};

type ProductionSchedule = {
  id: string;
  order_id: string;
  buyer: string;
  product: string;
  order_quantity: string;
  stage: string;
  planned_quantity: number;
  actual_quantity: number;
  start_date: string;
  target_date: string;
  status: string;
  notes: string;
  created_at: string;
};

type ScheduleForm = {
  orderId: string;
  stage: string;
  plannedQuantity: string;
  startDate: string;
  targetDate: string;
  status: string;
  notes: string;
};

type Props = {
  orders: PlanningOrder[];
};

const STAGES = ["Cutting", "Sewing", "Finishing", "QC"];
const STATUSES = ["Planned", "In Progress", "Completed", "Delayed"];

const emptyForm: ScheduleForm = {
  orderId: "",
  stage: "Cutting",
  plannedQuantity: "",
  startDate: new Date().toISOString().slice(0, 10),
  targetDate: "",
  status: "Planned",
  notes: "",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value || 0);
}

function getOrderQuantity(quantity: string) {
  const parsed = Number.parseInt(String(quantity).replace(/,/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getProgress(actual: number, planned: number) {
  if (planned <= 0) return 0;
  return Math.min(100, Math.round((actual / planned) * 100));
}

function statusClass(status: string) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

export default function Planning({ orders }: Props) {
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProductionSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductionSchedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);

  const loadSchedules = async (quiet = false) => {
    try {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError("");

      const result = await invoke<ProductionSchedule[]>(
        "list_production_schedules"
      );
      setSchedules(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSchedules();
  }, []);

  const filteredSchedules = useMemo(() => {
    const query = search.trim().toLowerCase();

    return schedules.filter((item) => {
      const matchesFilter = filter === "All" || item.status === filter;
      const matchesSearch =
        !query ||
        `${item.order_id} ${item.buyer} ${item.product} ${item.stage}`
          .toLowerCase()
          .includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [schedules, filter, search]);

  const totals = useMemo(() => ({
    total: schedules.length,
    planned: schedules.filter((item) => item.status === "Planned").length,
    inProgress: schedules.filter((item) => item.status === "In Progress").length,
    completed: schedules.filter((item) => item.status === "Completed").length,
    delayed: schedules.filter((item) => item.status === "Delayed").length,
    plannedQuantity: schedules.reduce((sum, item) => sum + item.planned_quantity, 0),
    actualQuantity: schedules.reduce((sum, item) => sum + item.actual_quantity, 0),
  }), [schedules]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      orderId: orders[0]?.id ?? "",
      plannedQuantity: orders[0]
        ? String(getOrderQuantity(orders[0].quantity))
        : "",
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (item: ProductionSchedule) => {
    setEditing(item);
    setForm({
      orderId: item.order_id,
      stage: item.stage,
      plannedQuantity: String(item.planned_quantity),
      startDate: item.start_date,
      targetDate: item.target_date,
      status: item.status,
      notes: item.notes,
    });
    setError("");
    setShowModal(true);
  };

  const updateForm = (key: keyof ScheduleForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const quantity = Number(form.plannedQuantity);

    if (!form.orderId) {
      setError("Please select an order.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Planned quantity must be a positive whole number.");
      return;
    }

    if (!form.startDate || !form.targetDate) {
      setError("Please provide both start date and target date.");
      return;
    }

    if (form.targetDate < form.startDate) {
      setError("Target date cannot be earlier than the start date.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        orderId: form.orderId,
        stage: form.stage,
        plannedQuantity: quantity,
        startDate: form.startDate,
        targetDate: form.targetDate,
        status: form.status,
        notes: form.notes.trim(),
      };

      if (editing) {
        await invoke("update_production_schedule", {
          id: editing.id,
          ...payload,
        });
      } else {
        await invoke("create_production_schedule", payload);
      }

      setShowModal(false);
      setEditing(null);
      await loadSchedules(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const removeSchedule = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setError("");

    try {
      await invoke("delete_production_schedule", {
        id: deleteTarget.id,
      });
      setDeleteTarget(null);
      await loadSchedules(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setDeleting(false);
    }
  };

  const selectedOrder = orders.find((order) => order.id === form.orderId);

  if (loading) {
    return (
      <div className="production-loading">
        <RefreshCw className="production-spinning" size={23} />
        <span>Loading production schedules...</span>
      </div>
    );
  }

  return (
    <section className="production-control-center planning-module">
      <div className="production-header">
        <div>
          <div className="production-eyebrow">
            <span className="production-live-dot" />
            PRODUCTION SCHEDULING
          </div>
          <h2>Production Planning</h2>
          <p>Plan stage-wise production targets and track actual output.</p>
        </div>

        <div className="production-header-actions">
          <button
            className="button button-secondary"
            onClick={() => void loadSchedules(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "production-spinning" : ""} />
            Refresh
          </button>
          <button
            className="button button-primary"
            onClick={openCreate}
            disabled={orders.length === 0}
          >
            <Plus size={15} />
            Add Schedule
          </button>
        </div>
      </div>

      {error && !showModal && (
        <div className="planning-error">
          <AlertCircle size={15} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="production-kpi-grid planning-kpis">
        <div className="production-kpi-card">
          <div className="production-kpi-icon violet"><CalendarDays size={16} /></div>
          <span>Total schedules</span>
          <strong>{totals.total}</strong>
          <small>Across all orders</small>
        </div>
        <div className="production-kpi-card">
          <div className="production-kpi-icon blue"><Clock3 size={16} /></div>
          <span>In progress</span>
          <strong>{totals.inProgress}</strong>
          <small>{totals.planned} planned</small>
        </div>
        <div className="production-kpi-card">
          <div className="production-kpi-icon green"><CheckCircle2 size={16} /></div>
          <span>Completed</span>
          <strong>{totals.completed}</strong>
          <small>Finished schedules</small>
        </div>
        <div className="production-kpi-card">
          <div className="production-kpi-icon orange"><AlertCircle size={16} /></div>
          <span>Delayed</span>
          <strong>{totals.delayed}</strong>
          <small>Needs attention</small>
        </div>
      </div>

      <div className="planning-overview production-content-card">
        <div className="production-card-heading">
          <div>
            <span className="production-section-kicker">OUTPUT OVERVIEW</span>
            <h3>Planned vs actual production</h3>
            <p>Actual output is calculated from saved production records.</p>
          </div>
          <Factory size={19} />
        </div>
        <div className="planning-overview-values">
          <div>
            <span>Planned quantity</span>
            <strong>{formatNumber(totals.plannedQuantity)} <small>pcs</small></strong>
          </div>
          <div>
            <span>Actual quantity</span>
            <strong>{formatNumber(totals.actualQuantity)} <small>pcs</small></strong>
          </div>
          <div>
            <span>Overall achievement</span>
            <strong>
              {getProgress(totals.actualQuantity, totals.plannedQuantity)}%
            </strong>
          </div>
        </div>
        <div className="production-health-track planning-overview-track">
          <div
            style={{
              width: `${getProgress(totals.actualQuantity, totals.plannedQuantity)}%`,
            }}
          />
        </div>
      </div>

      <div className="production-section-block planning-schedule-section">
        <div className="production-section-title">
          <div>
            <span className="production-section-kicker">SCHEDULE REGISTER</span>
            <h3>Production schedules</h3>
            <p>Manage planned dates, stage targets and progress.</p>
          </div>
          <span className="production-section-meta">
            {filteredSchedules.length} records
          </span>
        </div>

        <div className="planning-toolbar">
          <div className="production-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, buyer, product or stage..."
            />
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter schedules by status"
          >
            <option value="All">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {orders.length === 0 ? (
          <div className="production-empty">
            <ClipboardList size={22} />
            <strong>No orders available</strong>
            <span>Create an order before adding a production schedule.</span>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="production-empty">
            <CalendarDays size={22} />
            <strong>No schedules found</strong>
            <span>
              {schedules.length === 0
                ? "Add a schedule to start planning production."
                : "Try changing your search or status filter."}
            </span>
          </div>
        ) : (
          <div className="production-table-wrap planning-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order / Product</th>
                  <th>Stage</th>
                  <th>Planned</th>
                  <th>Actual progress</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((item) => {
                  const progress = getProgress(
                    item.actual_quantity,
                    item.planned_quantity
                  );

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="planning-order-cell">
                          <strong>{item.product}</strong>
                          <span>{item.order_id} · {item.buyer}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`production-stage-badge ${item.stage.toLowerCase()}`}>
                          {item.stage}
                        </span>
                      </td>
                      <td>
                        <strong className="planning-quantity">
                          {formatNumber(item.planned_quantity)}
                        </strong>
                        <small className="planning-muted">pcs</small>
                      </td>
                      <td>
                        <div className="planning-progress-cell">
                          <div className="planning-progress-copy">
                            <strong>{progress}%</strong>
                            <span>
                              {formatNumber(item.actual_quantity)} / {formatNumber(item.planned_quantity)}
                            </span>
                          </div>
                          <div className="production-mini-track">
                            <div style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="planning-date-cell">
                          <strong>{item.start_date}</strong>
                          <span>to {item.target_date}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`planning-status ${statusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="production-row-actions">
                          <button
                            className="production-icon-button"
                            onClick={() => openEdit(item)}
                            title="Edit schedule"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="production-icon-button danger"
                            onClick={() => setDeleteTarget(item)}
                            title="Delete schedule"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) {
            setShowModal(false);
          }
        }}>
          <div className="production-modal planning-modal">
            <div className="modal-heading">
              <div>
                <h2>{editing ? "Edit production schedule" : "Create production schedule"}</h2>
                <p>Set the target and timeline for a production stage.</p>
              </div>
              <button
                className="production-icon-button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form className="production-form" onSubmit={saveSchedule}>
              <label>
                Production order
                <select
                  value={form.orderId}
                  onChange={(event) => {
                    const nextOrder = orders.find((order) => order.id === event.target.value);
                    updateForm("orderId", event.target.value);
                    if (nextOrder && !editing) {
                      updateForm("plannedQuantity", String(getOrderQuantity(nextOrder.quantity)));
                    }
                  }}
                  required
                >
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.id} — {order.product} ({order.buyer})
                    </option>
                  ))}
                </select>
              </label>

              {selectedOrder && (
                <div className="planning-order-info">
                  <span>Order quantity</span>
                  <strong>{formatNumber(getOrderQuantity(selectedOrder.quantity))} pcs</strong>
                </div>
              )}

              <div className="planning-form-grid">
                <label>
                  Production stage
                  <select
                    value={form.stage}
                    onChange={(event) => updateForm("stage", event.target.value)}
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Planned quantity (pcs)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.plannedQuantity}
                    onChange={(event) => updateForm("plannedQuantity", event.target.value)}
                    required
                  />
                </label>

                <label>
                  Start date
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateForm("startDate", event.target.value)}
                    required
                  />
                </label>

                <label>
                  Target date
                  <input
                    type="date"
                    min={form.startDate}
                    value={form.targetDate}
                    onChange={(event) => updateForm("targetDate", event.target.value)}
                    required
                  />
                </label>
              </div>

              <label>
                Schedule status
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label>
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Optional production planning notes..."
                />
              </label>

              {error && (
                <div className="planning-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editing ? "Save changes" : "Create schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="production-modal production-delete-modal">
            <div className="modal-heading">
              <div>
                <h2>Delete schedule?</h2>
                <p>This action cannot be undone.</p>
              </div>
              <button
                className="production-icon-button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="planning-delete-summary">
              <strong>{deleteTarget.product} · {deleteTarget.stage}</strong>
              <span>{deleteTarget.order_id} · {deleteTarget.start_date} to {deleteTarget.target_date}</span>
            </div>
            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="button production-delete-button"
                onClick={() => void removeSchedule()}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
