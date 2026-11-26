import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { generateFactoryHealthPdf } from "./reportPdf";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Factory,
  FileDown,
  Package,
  RefreshCw,
  Truck,
  Wrench,
} from "lucide-react";

type OrderReportSummary = {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  at_risk_orders: number;
  average_progress: number;
};

type ProductionStageSummary = {
  stage: string;
  record_count: number;
  completed_quantity: number;
};

type InventoryReportSummary = {
  total_materials: number;
  low_stock_materials: number;
  out_of_stock_materials: number;
};

type ProcurementReportSummary = {
  total_purchase_orders: number;
  open_purchase_orders: number;
  received_purchase_orders: number;
  ordered_value: number;
  outstanding_value: number;
};

type MachineReportSummary = {
  total_machines: number;
  active_machines: number;
  idle_machines: number;
  maintenance_machines: number;
  inactive_machines: number;
  total_maintenance_cost: number;
};

type ReportsSummary = {
  orders: OrderReportSummary;
  production_by_stage: ProductionStageSummary[];
  inventory: InventoryReportSummary;
  procurement: ProcurementReportSummary;
  machines: MachineReportSummary;
};

type ReportOrderIssue = {
  id: string;
  buyer: string;
  product: string;
  quantity: string;
  due: string;
  progress: number;
  status: string;
  is_overdue: boolean;
};

type ReportScheduleIssue = {
  id: string;
  order_id: string;
  buyer: string;
  product: string;
  stage: string;
  planned_quantity: number;
  actual_quantity: number;
  target_date: string;
  status: string;
  behind_plan: boolean;
};

type ReportMaterialIssue = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  is_out_of_stock: boolean;
};

type ReportPurchaseOrderIssue = {
  id: string;
  po_number: string;
  supplier_name: string;
  expected_delivery_date: string;
  status: string;
  outstanding_value: number;
};

type ReportMachineIssue = {
  id: string;
  machine_code: string;
  name: string;
  department: string;
  status: string;
  next_maintenance_date: string;
  attention_reason: string;
};

export type FactoryHealthReport = {
  generated_at: string;
  overall_status: string;
  summary: ReportsSummary;
  overdue_order_count: number;
  delayed_schedule_count: number;
  late_purchase_order_count: number;
  machine_attention_count: number;
  order_issues: ReportOrderIssue[];
  production_schedules: ReportScheduleIssue[];
  material_issues: ReportMaterialIssue[];
  late_purchase_orders: ReportPurchaseOrderIssue[];
  machine_issues: ReportMachineIssue[];
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string) => {
  if (!value) return "Not scheduled";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Reports() {
  const [exporting, setExporting] = useState(false);
const [exportMessage, setExportMessage] = useState("");
  const [report, setReport] = useState<FactoryHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await invoke<FactoryHealthReport>(
        "get_factory_health_report"
      );
      setReport(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const exportPdf = useCallback(async () => {
  if (!report) return;

  setExporting(true);
  setExportMessage("");

  try {
    const now = new Date();
    const dateStamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    const path = await save({
      title: "Save Factory Health Report",
      defaultPath: `OrderFit-Factory-Health-Report-${dateStamp}.pdf`,
      filters: [
        {
          name: "PDF Document",
          extensions: ["pdf"],
        },
      ],
    });

    if (!path) return;

    const pdfData = generateFactoryHealthPdf(report);

    await invoke("save_pdf_file", {
      path,
      pdfData: Array.from(pdfData),
    });

    setExportMessage("Factory Health Report PDF saved successfully.");
  } catch (err) {
    setExportMessage(`PDF export failed: ${String(err)}`);
  } finally {
    setExporting(false);
  }
}, [report]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  if (loading) {
    return (
      <section className="panel report-loading">
        <RefreshCw size={22} className="report-spin" />
        <strong>Preparing factory health report</strong>
        <span>Collecting operational data from your workspace...</span>
      </section>
    );
  }

  if (error || !report) {
    return (
      <section className="panel report-error">
        <AlertCircle size={25} />
        <h2>Unable to load factory report</h2>
        <p>{error || "No report data was returned."}</p>
        <button className="button button-primary" onClick={loadReport}>
          <RefreshCw size={14} /> Try again
        </button>
      </section>
    );
  }

  const { summary } = report;
  const delayedSchedules = report.production_schedules.filter((item) => item.behind_plan);

  const statusClass =
    report.overall_status === "Critical"
      ? "critical"
      : report.overall_status === "Needs Attention"
        ? "needs-attention"
        : "healthy";

  const totalIssues =
    report.overdue_order_count +
    report.delayed_schedule_count +
    report.late_purchase_order_count +
    report.machine_attention_count +
    report.material_issues.length;

  const findings = [
    {
      title: "Overdue orders",
      count: report.overdue_order_count,
      description: "Orders that have passed their due date and are not completed.",
      icon: Clock,
    },
    {
      title: "Production delays",
      count: report.delayed_schedule_count,
      description: "Production schedules that are behind their planned quantities or dates.",
      icon: Activity,
    },
    {
      title: "Material shortages",
      count: report.material_issues.length,
      description: "Materials at or below their minimum stock level.",
      icon: Package,
    },
    {
      title: "Late procurement",
      count: report.late_purchase_order_count,
      description: "Purchase orders with expected delivery dates in the past.",
      icon: Truck,
    },
    {
      title: "Machine attention",
      count: report.machine_attention_count,
      description: "Machines requiring maintenance or operational attention.",
      icon: Wrench,
    },
  ];

  return (
    <div className="reports-page">
      <div className="report-toolbar">
        <div>
          <span className="report-eyebrow">OPERATIONAL INTELLIGENCE</span>
          <p>Live overview generated from your factory records</p>
        </div>
        <div className="report-toolbar-actions">
  <button
    className="button button-primary"
    onClick={exportPdf}
    disabled={exporting || !report}
  >
    <FileDown size={14} />
    {exporting ? "Generating PDF..." : "Export PDF"}
  </button>

  <button
    className="button button-secondary"
    onClick={loadReport}
    disabled={loading || exporting}
  >
    <RefreshCw size={13} /> Refresh report
  </button>
</div>
{exportMessage && (
  <p className="report-export-feedback" role="status">
    {exportMessage}
  </p>
)}
      </div>

      <section className={`report-health-banner ${statusClass}`}>
        <div className="report-health-icon">
          {report.overall_status === "Good" ? (
            <CheckCircle2 size={25} />
          ) : report.overall_status === "Critical" ? (
            <AlertCircle size={25} />
          ) : (
            <AlertTriangle size={25} />
          )}
        </div>
        <div className="report-health-copy">
          <span>OVERALL FACTORY HEALTH</span>
          <h2>{report.overall_status}</h2>
          <p>
            {report.overall_status === "Good"
              ? "No critical operational warning was detected in the current records."
              : report.overall_status === "Critical"
                ? "Critical operational risks require management attention."
                : "Some operational areas need review to keep factory activities on track."}
          </p>
        </div>
        <div className="report-health-total">
          <strong>{formatNumber(totalIssues)}</strong>
          <span>Reported findings</span>
        </div>
      </section>

      <div className="report-section-heading">
        <div>
          <h2>Factory performance overview</h2>
          <p>Current operational position across key departments</p>
        </div>
      </div>

      <div className="report-kpi-grid">
        <article className="report-kpi">
          <div className="report-kpi-top">
            <span>Orders</span>
            <span className="report-kpi-icon violet"><Factory size={16} /></span>
          </div>
          <strong>{formatNumber(summary.orders.total_orders)}</strong>
          <small>
            {formatNumber(summary.orders.active_orders)} active ·{" "}
            {formatNumber(summary.orders.completed_orders)} completed
          </small>
        </article>

        <article className="report-kpi">
          <div className="report-kpi-top">
            <span>Average order progress</span>
            <span className="report-kpi-icon blue"><Activity size={16} /></span>
          </div>
          <strong>{formatNumber(summary.orders.average_progress)}%</strong>
          <small>
            {formatNumber(summary.orders.at_risk_orders)} orders at risk
          </small>
        </article>

        <article className="report-kpi">
          <div className="report-kpi-top">
            <span>Materials</span>
            <span className="report-kpi-icon orange"><Package size={16} /></span>
          </div>
          <strong>{formatNumber(summary.inventory.total_materials)}</strong>
          <small>
            {formatNumber(summary.inventory.low_stock_materials)} low stock ·{" "}
            {formatNumber(summary.inventory.out_of_stock_materials)} out of stock
          </small>
        </article>

        <article className="report-kpi">
          <div className="report-kpi-top">
            <span>Machines</span>
            <span className="report-kpi-icon green"><Wrench size={16} /></span>
          </div>
          <strong>{formatNumber(summary.machines.total_machines)}</strong>
          <small>
            {formatNumber(summary.machines.active_machines)} active ·{" "}
            {formatNumber(summary.machines.maintenance_machines)} in maintenance
          </small>
        </article>
      </div>

      <div className="report-section-heading">
        <div>
          <h2>Management attention required</h2>
          <p>Findings that may affect delivery, production or factory operations</p>
        </div>
        <span className="report-finding-count">{totalIssues} findings</span>
      </div>

      <section className="panel report-findings">
        {findings.map((finding) => {
          const Icon = finding.icon;
          return (
            <div className="report-finding-row" key={finding.title}>
              <span className={`report-finding-icon ${finding.count ? "warning" : "success"}`}>
                <Icon size={16} />
              </span>
              <div className="report-finding-copy">
                <strong>{finding.title}</strong>
                <span>{finding.description}</span>
              </div>
              <strong className={finding.count ? "report-count-warning" : "report-count-ok"}>
                {finding.count}
              </strong>
            </div>
          );
        })}
      </section>

      <div className="report-detail-grid">
        <section className="panel report-detail-panel">
          <div className="panel-heading">
            <div>
              <h2>Order delivery risks</h2>
              <p>Orders requiring delivery follow-up</p>
            </div>
            <span className="report-section-count">{report.order_issues.length}</span>
          </div>
          {report.order_issues.length === 0 ? (
            <div className="report-empty"><CheckCircle2 size={17} /> No order delivery risks found.</div>
          ) : (
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr><th>ORDER</th><th>BUYER / PRODUCT</th><th>DUE DATE</th><th>PROGRESS</th><th>STATUS</th></tr>
                </thead>
                <tbody>
                  {report.order_issues.map((order) => (
                    <tr key={order.id}>
                      <td className="order-id">{order.id}</td>
                      <td><strong>{order.buyer}</strong><br />{order.product}</td>
                      <td>{formatDate(order.due)}</td>
                      <td>{formatNumber(order.progress)}%</td>
                      <td><span className={`report-status ${order.is_overdue ? "danger" : "warning"}`}>
                        {order.is_overdue ? "Overdue" : order.status}
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel report-detail-panel">
          <div className="panel-heading">
            <div>
              <h2>Production schedule delays</h2>
              <p>Planned quantity compared with actual output</p>
            </div>
            <span className="report-section-count">{delayedSchedules.length}</span>
          </div>
          {delayedSchedules.length === 0 ? (
            <div className="report-empty"><CheckCircle2 size={17} /> No delayed production schedules found.</div>
          ) : (
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr><th>ORDER</th><th>STAGE</th><th>PLANNED</th><th>ACTUAL</th><th>TARGET</th></tr>
                </thead>
                <tbody>
                  {delayedSchedules.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.order_id}</strong><br />{item.buyer}</td>
                      <td>{item.stage}</td>
                      <td>{formatNumber(item.planned_quantity)}</td>
                      <td>{formatNumber(item.actual_quantity)}</td>
                      <td>{formatDate(item.target_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel report-detail-panel">
          <div className="panel-heading">
            <div>
              <h2>Material shortages</h2>
              <p>Inventory below or at minimum stock level</p>
            </div>
            <span className="report-section-count">{report.material_issues.length}</span>
          </div>
          {report.material_issues.length === 0 ? (
            <div className="report-empty"><CheckCircle2 size={17} /> No material shortages found.</div>
          ) : (
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr><th>MATERIAL</th><th>SKU</th><th>AVAILABLE</th><th>MINIMUM</th><th>STATUS</th></tr>
                </thead>
                <tbody>
                  {report.material_issues.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong><br />{item.category}</td>
                      <td>{item.sku}</td>
                      <td>{formatNumber(item.current_stock)} {item.unit}</td>
                      <td>{formatNumber(item.minimum_stock)} {item.unit}</td>
                      <td><span className={`report-status ${item.is_out_of_stock ? "danger" : "warning"}`}>
                        {item.is_out_of_stock ? "Out of stock" : "Low stock"}
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel report-detail-panel">
          <div className="panel-heading">
            <div>
              <h2>Late purchase orders</h2>
              <p>Procurement deliveries past expected date</p>
            </div>
            <span className="report-section-count">{report.late_purchase_orders.length}</span>
          </div>
          {report.late_purchase_orders.length === 0 ? (
            <div className="report-empty"><CheckCircle2 size={17} /> No late purchase orders found.</div>
          ) : (
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr><th>PO NUMBER</th><th>SUPPLIER</th><th>EXPECTED</th><th>STATUS</th><th>OUTSTANDING</th></tr>
                </thead>
                <tbody>
                  {report.late_purchase_orders.map((item) => (
                    <tr key={item.id}>
                      <td className="order-id">{item.po_number}</td>
                      <td>{item.supplier_name}</td>
                      <td>{formatDate(item.expected_delivery_date)}</td>
                      <td>{item.status}</td>
                      <td>{formatCurrency(item.outstanding_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel report-detail-panel">
          <div className="panel-heading">
            <div>
              <h2>Machine attention</h2>
              <p>Maintenance and availability concerns</p>
            </div>
            <span className="report-section-count">{report.machine_issues.length}</span>
          </div>
          {report.machine_issues.length === 0 ? (
            <div className="report-empty"><CheckCircle2 size={17} /> No machine issues found.</div>
          ) : (
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr><th>MACHINE</th><th>DEPARTMENT</th><th>STATUS</th><th>NEXT MAINTENANCE</th><th>ATTENTION</th></tr>
                </thead>
                <tbody>
                  {report.machine_issues.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.machine_code}</strong><br />{item.name}</td>
                      <td>{item.department}</td>
                      <td>{item.status}</td>
                      <td>{formatDate(item.next_maintenance_date)}</td>
                      <td>{item.attention_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel report-detail-panel">
          <div className="panel-heading">
            <div>
              <h2>Production output by stage</h2>
              <p>Recorded completed quantities across production stages</p>
            </div>
          </div>
          {summary.production_by_stage.length === 0 ? (
            <div className="report-empty">No production records available yet.</div>
          ) : (
            <div className="report-stage-list">
              {summary.production_by_stage.map((stage) => (
                <div className="report-stage-row" key={stage.stage}>
                  <div><strong>{stage.stage}</strong><span>{stage.record_count} records</span></div>
                  <strong>{formatNumber(stage.completed_quantity)} pcs</strong>
                </div>
              ))}
            </div>
          )}
          <div className="report-procurement-summary">
            <div><span>Purchase orders</span><strong>{summary.procurement.total_purchase_orders}</strong></div>
            <div><span>Open orders</span><strong>{summary.procurement.open_purchase_orders}</strong></div>
            <div><span>Outstanding value</span><strong>{formatCurrency(summary.procurement.outstanding_value)}</strong></div>
          </div>
        </section>
      </div>

      <div className="report-generated">
        <span>Report generated: {report.generated_at}</span>
        <span>Source: OrderFit local operational database</span>
      </div>
    </div>
  );
}

export default Reports;

