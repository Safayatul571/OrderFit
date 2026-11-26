
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  Factory,
  FileBarChart,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Truck,
  Users,
  X,
  Wrench,
} from "lucide-react";

import Production from "./Production";
import Planning from "./Planning";
import Materials from "./Materials";
import InventoryTransactions from "./InventoryTransactions";
import Suppliers from "./Suppliers";
import Buyers from "./Buyers";
import Workers from "./Workers";
import Machines from "./Machines";
import PurchaseOrders from "./PurchaseOrders";
import Reports from "./Reports";
import "./App.css";

type PageKey =
  | "Dashboard"
  | "Orders"
  | "Production"
  | "Buyers"
  | "Workers"
  | "Machines"
  | "Materials"
  | "Suppliers"
  | "Purchase Orders"
  | "Inventory"
  | "Planning"
  | "Reports"
  | "Settings";

type OrderStatus = "On Track" | "At Risk" | "Completed";

type ProductionEntry = {
  id: string;
  order_id: string;
  stage: string;
  completed_quantity: number;
  production_date: string;
  notes: string;
  created_at: string;
};

type Order = {
  id: string;
  buyer: string;
  product: string;
  quantity: string;
  due: string;
  progress: number;
  status: OrderStatus;
};

const navGroups = [
  {
    label: "WORKSPACE",
    items: [
      { name: "Dashboard" as PageKey, icon: LayoutDashboard },
      { name: "Orders" as PageKey, icon: ClipboardList },
      { name: "Production" as PageKey, icon: Factory },
      { name: "Planning" as PageKey, icon: CalendarDays },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      { name: "Buyers" as PageKey, icon: Users },
      { name: "Workers" as PageKey, icon: ShieldCheck },
      { name: "Machines" as PageKey, icon: Wrench },
      { name: "Materials" as PageKey, icon: Boxes },
      { name: "Suppliers" as PageKey, icon: Users },
      { name: "Purchase Orders" as PageKey, icon: ClipboardList },
      { name: "Inventory" as PageKey, icon: Truck },
    ],
  },
  {
    label: "INSIGHTS",
    items: [
      { name: "Reports" as PageKey, icon: FileBarChart },
      { name: "Settings" as PageKey, icon: Settings },
    ],
  },
];

function App() {
  const [page, setPage] = useState<PageKey>("Dashboard");
  const [orders, setOrders] = useState<Order[]>([]);

  const [productionEntries, setProductionEntries] =
  useState<ProductionEntry[]>([]);

const [productionLoading, setProductionLoading] =
  useState(false);

const [productionError, setProductionError] =
  useState("");

  const [databaseLoading, setDatabaseLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState("");

  const [query] = useState("");
  const [filter, setFilter] = useState("All orders");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);

  const [formBuyer, setFormBuyer] = useState("");
  const [formProduct, setFormProduct] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formDue, setFormDue] = useState("To be scheduled");
  const [formProgress, setFormProgress] = useState("0");
  const [formStatus, setFormStatus] = useState<OrderStatus>("On Track");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load orders from SQLite.
  const loadOrders = async () => {
    try {
      setDatabaseLoading(true);
      setDatabaseError("");

      const result = await invoke<Order[]>("list_orders");
      setOrders(result);
    } catch (error) {
      console.error("Failed to load orders:", error);
      setDatabaseError(String(error));
    } finally {
      setDatabaseLoading(false);
    }
  };

  // Load production records from SQLite.
const loadProductionEntries = async () => {
  try {
    setProductionLoading(true);
    setProductionError("");

    const result = await invoke<ProductionEntry[]>(
      "list_production_entries"
    );

    setProductionEntries(result);
  } catch (error) {
    console.error("Failed to load production entries:", error);
    setProductionError(String(error));
  } finally {
    setProductionLoading(false);
  }
};

  useEffect(() => {
    void loadOrders();
  }, []);

  useEffect(() => {
  if (page === "Dashboard") {
    void loadProductionEntries();
  }
}, [page]);
  // Search and filter.
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesQuery =
          `${order.id} ${order.buyer} ${order.product}`
            .toLowerCase()
            .includes(query.toLowerCase());

        const matchesFilter =
          filter === "All orders" || order.status === filter;

        return matchesQuery && matchesFilter;
      }),
    [orders, query, filter]
  );

  // Reset form.
  const resetForm = () => {
    setFormBuyer("");
    setFormProduct("");
    setFormQuantity("");
    setFormDue("To be scheduled");
    setFormProgress("0");
    setFormStatus("On Track");
    setEditingOrder(null);
  };

  // Open create modal.
  const openCreateModal = () => {
    resetForm();
    setDatabaseError("");
    setShowOrderModal(true);
  };

  // Open edit modal.
  const openEditModal = (order: Order) => {
    setEditingOrder(order);

    setFormBuyer(order.buyer);
    setFormProduct(order.product);
    setFormQuantity(
      order.quantity.replace(/\s*pcs$/i, "").trim()
    );
    setFormDue(order.due);
    setFormProgress(String(order.progress));
    setFormStatus(order.status);

    setDatabaseError("");
    setShowOrderModal(true);
  };

  // Close order modal.
  const closeOrderModal = () => {
    if (saving) return;

    setShowOrderModal(false);
    resetForm();
  };

  // Create or update order.
  const handleOrderSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const buyer = formBuyer.trim();
    const product = formProduct.trim();
    const quantityValue = Number(formQuantity);
    const progressValue = Number(formProgress);

    if (!buyer || !product || !formQuantity.trim()) {
      setDatabaseError(
        "Buyer, product and quantity are required."
      );
      return;
    }

    if (
      !Number.isInteger(quantityValue) ||
      quantityValue <= 0
    ) {
      setDatabaseError("Quantity must be a positive whole number.");
      return;
    }

    if (
      !Number.isInteger(progressValue) ||
      progressValue < 0 ||
      progressValue > 100
    ) {
      setDatabaseError("Progress must be between 0 and 100.");
      return;
    }

    try {
      setSaving(true);
      setDatabaseError("");

      if (editingOrder) {
        // Update existing order in SQLite.
        await invoke("update_order", {
          id: editingOrder.id,
          buyer,
          product,
          quantity: `${quantityValue} pcs`,
          due: formDue.trim() || "To be scheduled",
          progress: progressValue,
          status: formStatus,
        });

        await loadOrders();
      } else {
        // Create new order in SQLite.
        const newOrder = await invoke<Order>("create_order", {
          buyer,
          product,
          quantity: `${quantityValue} pcs`,
          due: formDue.trim() || "To be scheduled",
        });

        setOrders((current) => [newOrder, ...current]);
      }

      setShowOrderModal(false);
      resetForm();
      setPage("Orders");
    } catch (error) {
      console.error("Failed to save order:", error);
      setDatabaseError(String(error));
    } finally {
      setSaving(false);
    }
  };

  // Delete order from SQLite.
  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;

    try {
      setDeleting(true);
      setDatabaseError("");

      await invoke("delete_order", {
        id: deletingOrder.id,
      });

      setOrders((current) =>
        current.filter((order) => order.id !== deletingOrder.id)
      );

      setDeletingOrder(null);
    } catch (error) {
      console.error("Failed to delete order:", error);
      setDatabaseError(String(error));
    } finally {
      setDeleting(false);
    }
  };



  

const dashboardStats = useMemo(() => {
  const totalOrders = orders.length;

  const onTrackCount = orders.filter(
    (order) => order.status === "On Track"
  ).length;

  const atRiskCount = orders.filter(
    (order) => order.status === "At Risk"
  ).length;

  const completedCount = orders.filter(
    (order) => order.status === "Completed"
  ).length;

  const activeOrders = totalOrders - completedCount;

  const averageProgress =
    totalOrders === 0
      ? 0
      : Math.round(
          orders.reduce(
            (total, order) => total + order.progress,
            0
          ) / totalOrders
        );

  const onTrackPercentage =
    totalOrders === 0
      ? 0
      : (onTrackCount / totalOrders) * 100;

  const atRiskPercentage =
    totalOrders === 0
      ? 0
      : (atRiskCount / totalOrders) * 100;

  const completedPercentage =
    totalOrders === 0
      ? 0
      : (completedCount / totalOrders) * 100;

  return {
    totalOrders,
    onTrackCount,
    atRiskCount,
    completedCount,
    activeOrders,
    averageProgress,
    onTrackPercentage,
    atRiskPercentage,
    completedPercentage,
  };
}, [orders]);

const atRiskCount = dashboardStats.atRiskCount;



  return (
    <div className="app-shell">
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <Factory size={21} strokeWidth={2.3} />
            </div>

            <div>
              <div className="brand-name">OrderFit</div>
              <div className="brand-caption">MANUFACTURING OS</div>
            </div>

            <button
              className="icon-button sidebar-collapse"
              aria-label="Collapse sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronLeft size={17} />
            </button>
          </div>

          <div className="workspace-switch">
            <div className="workspace-avatar">OF</div>

            <div className="workspace-copy">
              <strong>OrderFit Workspace</strong>
              <span>Local environment</span>
            </div>

            <ChevronDown size={15} className="muted-icon" />
          </div>

          <nav className="side-nav">
            {navGroups.map((group) => (
              <div className="nav-group" key={group.label}>
                <div className="nav-label">{group.label}</div>

                {group.items.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    onClick={() => setPage(name)}
                    className={`nav-item ${
                      page === name ? "active" : ""
                    }`}
                  >
                    <Icon size={18} />
                    <span>{name}</span>

                    {name === "Orders" && (
                      <span className="nav-count">
                        {orders.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="help-card">
              <div className="help-icon">
                <CircleHelp size={17} />
              </div>

              <div>
                <strong>Need a hand?</strong>
                <span>Explore the workspace guide</span>
              </div>

              <ArrowRight size={15} />
            </div>

            <div className="profile-row">
              <div className="profile-avatar">AD</div>

              <div className="profile-copy">
                <strong>Administrator</strong>
                <span>Workspace owner</span>
              </div>

              <MoreHorizontal size={18} className="muted-icon" />
            </div>
          </div>
        </aside>
      )}

      <main className="main-area">


        <div className="content">
          {databaseError && (
            <div
              className="panel"
              style={{ padding: "14px", marginBottom: "16px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertTriangle size={18} />
                <strong>Database error</strong>
              </div>

              <p style={{ overflowWrap: "anywhere" }}>
                {databaseError}
              </p>

              <button
                className="button button-secondary"
                onClick={() => void loadOrders()}
                disabled={databaseLoading}
              >
                Retry connection
              </button>
            </div>
          )}

          {page === "Dashboard" ? (
            <>
              <div className="metric-grid">
                
<MetricCard
  label="Total orders"
  value={String(dashboardStats.totalOrders)}
  change="Live database"
  positive
  detail="All saved orders"
  icon={<ClipboardList size={18} />}
  tone="violet"
/>

<MetricCard
  label="Active orders"
  value={String(dashboardStats.activeOrders)}
  change="Currently in progress"
  positive
  detail="Not yet completed"
  icon={<Gauge size={18} />}
  tone="blue"
/>

<MetricCard
  label="Completed orders"
  value={String(dashboardStats.completedCount)}
  change="Successfully completed"
  positive
  detail="Completed orders"
  icon={<Truck size={18} />}
  tone="green"
/>

<MetricCard
  label="Average progress"
  value={`${dashboardStats.averageProgress}%`}
  change="Based on saved orders"
  positive
  detail="Average order progress"
  icon={<Boxes size={18} />}
  tone="orange"
/>

              </div>

              <div className="dashboard-grid">
                

<section className="panel production-panel">
  <div className="panel-heading">
    <div>
      <h2>Production overview</h2>
      <p>Live production progress across all orders</p>
    </div>

    <button className="select-button">
      All records <ChevronDown size={14} />
    </button>
  </div>

  {productionLoading ? (
    <div
      style={{
        minHeight: "240px",
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
      }}
    >
      Loading production data...
    </div>
  ) : productionError ? (
    <div
      style={{
        minHeight: "240px",
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
        textAlign: "center",
      }}
    >
      <div>
        <Gauge size={30} />
        <p>Unable to load production data.</p>
        <span>{productionError}</span>
      </div>
    </div>
  ) : (
    <div style={{ paddingTop: "12px" }}>
      {["Cutting", "Sewing", "Finishing", "QC"].map((stage) => {
        const completed = productionEntries
          .filter((entry) => entry.stage === stage)
          .reduce(
            (total, entry) => total + entry.completed_quantity,
            0
          );

        const target = orders.reduce((total, order) => {
          const match = order.quantity.trim().match(/^\d+/);
          return total + (match ? Number(match[0]) : 0);
        }, 0);

        const percentage =
          target > 0
            ? Math.min(100, Math.round((completed / target) * 100))
            : 0;

        return (
          <div
            key={stage}
            style={{
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "9px",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {stage}
              </span>

              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {completed.toLocaleString()} / {target.toLocaleString()} pcs
              </span>
            </div>

            <div
              style={{
                height: "8px",
                width: "100%",
                background: "var(--border-color)",
                borderRadius: "20px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${percentage}%`,
                  background: "var(--primary)",
                  borderRadius: "20px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        );
      })}

      <div
        style={{
          borderTop: "1px solid var(--border-color)",
          paddingTop: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div>
          <span
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            Total production records
          </span>
          <strong style={{ fontSize: "19px" }}>
            {productionEntries.length}
          </strong>
        </div>

        <div style={{ textAlign: "right" }}>
          <span
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            QC completed
          </span>
          <strong style={{ fontSize: "19px" }}>
            {productionEntries
              .filter((entry) => entry.stage === "QC")
              .reduce(
                (total, entry) => total + entry.completed_quantity,
                0
              ).toLocaleString()} pcs
          </strong>
        </div>
      </div>
    </div>
  )}
</section>


                <section className="panel status-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Order status</h2>
                      <p>Current order distribution</p>
                    </div>

                    <button
                      className="more-button"
                      aria-label="More options"
                    >
                      <MoreHorizontal size={19} />
                    </button>
                  </div>


                  <div className="donut-wrap">
                    <div
                      className="donut"
                      style={{
                        background:
                          dashboardStats.totalOrders === 0
                            ? "conic-gradient(#eceef4 0 100%)"
                            : `conic-gradient(
                                #705cdd 0% ${dashboardStats.onTrackPercentage}%,
                                #8eb5ed ${dashboardStats.onTrackPercentage}% ${
                                  dashboardStats.onTrackPercentage +
                                  dashboardStats.atRiskPercentage
                                }%,
                                #72c29a ${
                                  dashboardStats.onTrackPercentage +
                                  dashboardStats.atRiskPercentage
                                }% 100%
                              )`,
                      }}
                    >
                      <div className="donut-center">
                        <strong>{dashboardStats.totalOrders}</strong>
                        <span>Total orders</span>
                      </div>
                    </div>
                  </div>


                  <div className="status-legend">
                    <div>
                      <span>
                        <i className="status-dot dot-violet" />
                        On Track
                      </span>
                      <strong>
  {dashboardStats.onTrackCount} ({dashboardStats.onTrackPercentage.toFixed(1)}%)
</strong>
                    </div>

                    <div>
                      <span>
                        <i className="status-dot dot-blue" />
                        At Risk
                      </span>
                      <strong>
  {dashboardStats.atRiskCount} ({dashboardStats.atRiskPercentage.toFixed(1)}%)
</strong>
                    </div>

                    <div>
                      <span>
                        <i className="status-dot dot-green" />
                        Completed
                      </span>
                      <strong>
  {dashboardStats.completedCount} ({dashboardStats.completedPercentage.toFixed(1)}%)
</strong>
                    </div>
                  </div>
                </section>
              </div>

              <div className="lower-grid">
                <section className="panel orders-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent orders</h2>
                      <p>Latest orders saved in your database</p>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => setPage("Orders")}
                    >
                      View all orders <ArrowRight size={15} />
                    </button>
                  </div>

                  {databaseLoading ? (
                    <p style={{ padding: "20px" }}>
                      Loading orders...
                    </p>
                  ) : (
                    <OrderTable
                      orders={orders.slice(0, 4)}
                      compact
                      onEdit={openEditModal}
                      onDelete={setDeletingOrder}
                    />
                  )}
                </section>

                <section className="panel attention-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Needs attention</h2>
                      <p>Orders that may need your review</p>
                    </div>

                    <span className="attention-count">
                      {atRiskCount}
                    </span>
                  </div>

                  {orders
                    .filter((o) => o.status === "At Risk")
                    .map((order) => (
                      <div className="attention-item" key={order.id}>
                        <div className="attention-icon warning">
                          <AlertTriangle size={17} />
                        </div>

                        <div className="attention-copy">
                          <strong>Order delivery at risk</strong>
                          <span>
                            {order.buyer} Ãƒâ€šÃ‚Â· {order.id}
                          </span>
                          <small>{order.due}</small>
                        </div>

                        <button
                          className="icon-button"
                          aria-label="Edit order"
                          onClick={() => openEditModal(order)}
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                    ))}

                  {atRiskCount === 0 && (
                    <p
                      style={{
                        padding: "16px",
                        color: "var(--text-muted)",
                      }}
                    >
                      No orders currently need attention.
                    </p>
                  )}

                  <button
                    className="attention-link"
                    onClick={() => setPage("Orders")}
                  >
                    Review all orders <ArrowRight size={14} />
                  </button>
                </section>
              </div>
            </>
            
                    ) : page === "Production" ? (
            <Production orders={orders} />
          ) : page === "Planning" ? (
            <Planning orders={orders} />
          ) : page === "Materials" ? (
            <Materials />
          ) : page === "Machines" ? (
            <Machines />
          ) : page === "Workers" ? (
            <Workers />
          ) : page === "Buyers" ? (
            <Buyers orders={orders} />
          ) : page === "Suppliers" ? (
            <Suppliers />
          ) : page === "Purchase Orders" ? (
            <PurchaseOrders />
          ) : page === "Reports" ? (
            <Reports />
          ) : page === "Inventory" ? (
            <InventoryTransactions />
          ) : (
            <section className="panel module-panel">
              <div className="module-empty-icon">
                                {page === "Orders" ? (
                  <ClipboardList />
                ) : (
                  <Settings />
                )}
              </div>

              <h2>{page} workspace</h2>

              <p>
                {page === "Orders"
                  ? "Manage orders saved in your local SQLite database."
                  : "This module's database-backed workflows are planned for the next implementation milestone."}
              </p>

              {page === "Orders" ? (
                <>
                  <div className="module-toolbar">
                    <div className="filter-tabs">
                      {[
                        "All orders",
                        "On Track",
                        "At Risk",
                        "Completed",
                      ].map((f) => (
                        <button
                          key={f}
                          className={filter === f ? "selected" : ""}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <button
                      className="button button-primary"
                      onClick={openCreateModal}
                    >
                      <Plus size={16} />
                      New order
                    </button>
                  </div>

                  {databaseLoading ? (
                    <p style={{ padding: "20px" }}>
                      Loading orders from database...
                    </p>
                  ) : (
                    <OrderTable
                      orders={filteredOrders}
                      onEdit={openEditModal}
                      onDelete={setDeletingOrder}
                    />
                  )}
                </>
              ) : (
                <button
                  className="button button-secondary"
                  onClick={() => setPage("Dashboard")}
                >
                  Back to dashboard
                </button>
              )}
            </section>
          )}

          <footer className="footer">
            <span>
              Ãƒâ€šÃ‚Â© 2026 OrderFit. Manufacturing operations, made clearer.
            </span>

            <span>
              <span className="footer-status" />
              {databaseError
                ? "Database connection issue"
                : "Local workspace"}
              <span className="footer-separator"> Ãƒâ€šÃ‚Â· </span>
              SQLite
            </span>
          </footer>
        </div>
      </main>

      {/* Create / Edit Order Modal */}
      {showOrderModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeOrderModal();
            }
          }}
        >
          <form
            className="create-modal"
            onSubmit={handleOrderSubmit}
          >
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">
                  ORDER MANAGEMENT
                </span>

                <h2>
                  {editingOrder ? "Edit order" : "Create new order"}
                </h2>

                <p>
                  {editingOrder
                    ? `Update order ${editingOrder.id}.`
                    : "Save a new order to your local database."}
                </p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closeOrderModal}
                aria-label="Close"
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>

            {editingOrder && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "9px",
                  background: "var(--surface-secondary, #f5f3ff)",
                  marginBottom: "14px",
                  fontSize: "13px",
                }}
              >
                <strong>Order ID:</strong> {editingOrder.id}
              </div>
            )}

            <label>
              Buyer / company
              <input
                autoFocus
                value={formBuyer}
                onChange={(e) => setFormBuyer(e.target.value)}
                placeholder="e.g. Northstar Apparel"
                required
              />
            </label>

            <label>
              Product / style
              <input
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                placeholder="e.g. Cotton T-Shirt / Basic"
                required
              />
            </label>

            <label>
              Order quantity (pcs)
              <input
                type="number"
                min="1"
                step="1"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder="e.g. 2400"
                required
              />
            </label>

            <label>
              Due date / delivery schedule
              <input
                value={formDue}
                onChange={(e) => setFormDue(e.target.value)}
                placeholder="e.g. 2026-12-30"
              />
            </label>

            {editingOrder && (
              <>
                <label>
                  Production progress (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formProgress}
                    onChange={(e) => setFormProgress(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Order status
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as OrderStatus)
                    }
                  >
                    <option value="On Track">On Track</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>
              </>
            )}

            {databaseError && (
              <p
                style={{
                  color: "#dc2626",
                  fontSize: "13px",
                  overflowWrap: "anywhere",
                }}
              >
                {databaseError}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={closeOrderModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button button-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoaderCircle size={16} />
                    Saving...
                  </>
                ) : editingOrder ? (
                  <>
                    <CheckCircle2 size={16} />
                    Save changes
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create order
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              setDeletingOrder(null);
            }
          }}
        >
          <div className="create-modal">
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">
                  ORDER MANAGEMENT
                </span>
                <h2>Delete order?</h2>
                <p>
                  This action will permanently remove this order
                  from your local database.
                </p>
              </div>

              <button
                className="icon-button"
                onClick={() => setDeletingOrder(null)}
                disabled={deleting}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div
              style={{
                padding: "14px",
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: "10px",
                marginBottom: "18px",
              }}
            >
              <strong>{deletingOrder.buyer}</strong>
              <p style={{ margin: "6px 0" }}>
                {deletingOrder.product}
              </p>
              <small>{deletingOrder.id}</small>
            </div>

            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={() => setDeletingOrder(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="button button-primary"
                style={{ background: "#dc2626" }}
                onClick={() => void handleDeleteOrder()}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <LoaderCircle size={16} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  change,
  positive,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  change: string;
  positive: boolean;
  detail: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <section className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <div className={`metric-icon ${tone}`}>{icon}</div>
      </div>

      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>

      <div className="metric-bottom">
        <span
          className={`metric-change ${
            positive ? "positive" : "negative"
          }`}
        >
          {positive ? (
            <ArrowUpRight size={14} />
          ) : (
            <ArrowDownRight size={14} />
          )}
          {change}
        </span>

        <span>{detail}</span>
      </div>
    </section>
  );
}

function OrderTable({
  orders,
  compact = false,
  onEdit,
  onDelete,
}: {
  orders: Order[];
  compact?: boolean;
  onEdit?: (order: Order) => void;
  onDelete?: (order: Order) => void;
}) {
  return (
    <div className={`table-wrap ${compact ? "compact-table" : ""}`}>
      <table>
        <thead>
          <tr>
            <th>ORDER ID</th>
            <th>BUYER</th>
            <th>PRODUCT</th>
            <th>QUANTITY</th>
            <th>DUE DATE</th>
            <th>PROGRESS</th>
            <th>STATUS</th>
            {(onEdit || onDelete) && <th>ACTIONS</th>}
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <strong className="order-id">{order.id}</strong>
              </td>

              <td>
                <span className="buyer-cell">
                  <span className="buyer-avatar">
                    {order.buyer
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  {order.buyer}
                </span>
              </td>

              <td>{order.product}</td>
              <td>{order.quantity}</td>
              <td>{order.due}</td>

              <td>
                <div className="progress-cell">
                  <div className="progress-track">
                    <i style={{ width: `${order.progress}%` }} />
                  </div>
                  <span>{order.progress}%</span>
                </div>
              </td>

              <td>
                <span
                  className={`status-pill ${order.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  <i />
                  {order.status}
                </span>
              </td>

              {(onEdit || onDelete) && (
                <td>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {onEdit && (
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit order"
                        aria-label={`Edit ${order.id}`}
                        onClick={() => onEdit(order)}
                      >
                        <Pencil size={15} />
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        className="icon-button"
                        title="Delete order"
                        aria-label={`Delete ${order.id}`}
                        onClick={() => onDelete(order)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}

          {orders.length === 0 && (
            <tr>
              <td
                colSpan={onEdit || onDelete ? 8 : 7}
                className="empty-row"
              >
                No orders found. Create your first order to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;






