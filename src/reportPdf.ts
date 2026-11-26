import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FactoryHealthReport } from "./Reports";

const number = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value || 0);

const currency = (value: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value || 0);

const date = (value: string) => {
  if (!value) return "Not scheduled";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

type PdfDocument = jsPDF & {
  lastAutoTable?: { finalY: number };
};

const colors = {
  ink: [35, 39, 55] as [number, number, number],
  muted: [110, 116, 133] as [number, number, number],
  purple: [104, 83, 190] as [number, number, number],
  light: [244, 242, 250] as [number, number, number],
  border: [225, 226, 233] as [number, number, number],
};

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.ink);
  doc.text(title, 40, y);
  return y + 8;
}

function addTable(
  doc: PdfDocument,
  title: string,
  headers: string[],
  rows: string[][],
  startY: number
) {
  let y = addSectionTitle(doc, title, startY);

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows.length ? rows : [["No records available", ...headers.slice(1).map(() => "")]],
    theme: "grid",
    margin: { left: 40, right: 40, bottom: 45 },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 5,
      textColor: colors.ink,
      lineColor: colors.border,
      lineWidth: 0.35,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: colors.light,
      textColor: colors.purple,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [250, 249, 252],
    },
  });

  return (doc.lastAutoTable?.finalY ?? y) + 17;
}

function addParagraph(doc: jsPDF, text: string, y: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const lines = doc.splitTextToSize(text, 515);

  if (y + lines.length * 12 > pageHeight - 45) {
    doc.addPage();
    y = 50;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.ink);
  doc.text(lines, 40, y);

  return y + lines.length * 12 + 7;
}

export function generateFactoryHealthPdf(report: FactoryHealthReport): Uint8Array {
  const doc = new jsPDF("p", "pt", "a4") as PdfDocument;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { summary } = report;

  const delayedSchedules = report.production_schedules.filter(
    (item) => item.behind_plan
  );

  const findings = [
    ["Overdue orders", number(report.overdue_order_count)],
    ["Production delays", number(report.delayed_schedule_count)],
    ["Material shortages", number(report.material_issues.length)],
    ["Late procurement", number(report.late_purchase_order_count)],
    ["Machine attention", number(report.machine_attention_count)],
  ];

  // Report header
  doc.setFillColor(...colors.purple);
  doc.rect(0, 0, pageWidth, 9, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...colors.ink);
  doc.text("OrderFit", 40, 48);

  doc.setFontSize(10);
  doc.setTextColor(...colors.purple);
  doc.text("FACTORY HEALTH REPORT", 40, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text("Operational management overview", 40, 83);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...colors.ink);
  doc.text(`STATUS: ${report.overall_status.toUpperCase()}`, pageWidth - 40, 48, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text(`Generated: ${report.generated_at}`, pageWidth - 40, 65, {
    align: "right",
  });

  doc.setDrawColor(...colors.border);
  doc.line(40, 98, pageWidth - 40, 98);

  let y = 122;

  // Overall health statement
  y = addSectionTitle(doc, "Overall factory health", y);

  const healthText =
    report.overall_status === "Good"
      ? "No critical operational warning was detected in the current factory records."
      : report.overall_status === "Critical"
        ? "Critical operational risks were detected. Management review and corrective action are required."
        : "Some operational areas need management review to keep factory activities on track.";

  y = addParagraph(doc, healthText, y);

  // KPI overview
  y = addSectionTitle(doc, "Factory performance overview", y);

  const kpis = [
    ["Total orders", number(summary.orders.total_orders)],
    ["Active orders", number(summary.orders.active_orders)],
    ["Completed orders", number(summary.orders.completed_orders)],
    ["Average progress", `${number(summary.orders.average_progress)}%`],
    ["Total materials", number(summary.inventory.total_materials)],
    ["Low-stock materials", number(summary.inventory.low_stock_materials)],
    ["Total machines", number(summary.machines.total_machines)],
    ["Active machines", number(summary.machines.active_machines)],
  ];

  const cardWidth = (pageWidth - 80 - 18) / 4;
  const cardHeight = 43;

  kpis.forEach(([label, value], index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    const x = 40 + column * (cardWidth + 6);
    const cardY = y + row * (cardHeight + 7);

    doc.setFillColor(...colors.light);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 5, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.ink);
    doc.text(value, x + 8, cardY + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.muted);
    doc.text(label, x + 8, cardY + 31);
  });

  y += cardHeight * 2 + 30;

  // Management findings
  y = addTable(doc, "Management attention required",
    ["AREA", "FINDINGS"], findings, y);

  // Order risks
  y = addTable(doc, "Order delivery risks",
    ["ORDER", "BUYER", "PRODUCT", "DUE DATE", "PROGRESS", "STATUS"],
    report.order_issues.map((item) => [
      item.id,
      item.buyer,
      item.product,
      date(item.due),
      `${number(item.progress)}%`,
      item.is_overdue ? "Overdue" : item.status,
    ]),
    y
  );

  // Production delays
  y = addTable(doc, "Production schedule delays",
    ["ORDER", "STAGE", "PLANNED", "ACTUAL", "TARGET DATE"],
    delayedSchedules.map((item) => [
      item.order_id,
      item.stage,
      number(item.planned_quantity),
      number(item.actual_quantity),
      date(item.target_date),
    ]),
    y
  );

  // Material issues
  y = addTable(doc, "Material shortages",
    ["MATERIAL", "SKU", "AVAILABLE", "MINIMUM", "STATUS"],
    report.material_issues.map((item) => [
      item.name,
      item.sku,
      `${number(item.current_stock)} ${item.unit}`,
      `${number(item.minimum_stock)} ${item.unit}`,
      item.is_out_of_stock ? "Out of stock" : "Low stock",
    ]),
    y
  );

  // Late procurement
  y = addTable(doc, "Late purchase orders",
    ["PO NUMBER", "SUPPLIER", "EXPECTED DATE", "STATUS", "OUTSTANDING"],
    report.late_purchase_orders.map((item) => [
      item.po_number,
      item.supplier_name,
      date(item.expected_delivery_date),
      item.status,
      currency(item.outstanding_value),
    ]),
    y
  );

  // Machine attention
  y = addTable(doc, "Machine attention",
    ["MACHINE", "DEPARTMENT", "STATUS", "NEXT MAINTENANCE", "REASON"],
    report.machine_issues.map((item) => [
      `${item.machine_code} - ${item.name}`,
      item.department,
      item.status,
      date(item.next_maintenance_date),
      item.attention_reason,
    ]),
    y
  );

  // Production stage output
  y = addTable(doc, "Production output by stage",
    ["STAGE", "RECORD COUNT", "COMPLETED QUANTITY"],
    summary.production_by_stage.map((item) => [
      item.stage,
      number(item.record_count),
      `${number(item.completed_quantity)} pcs`,
    ]),
    y
  );

  // Procurement overview
  y = addTable(doc, "Procurement overview",
    ["METRIC", "VALUE"],
    [
      ["Total purchase orders", number(summary.procurement.total_purchase_orders)],
      ["Open purchase orders", number(summary.procurement.open_purchase_orders)],
      ["Received purchase orders", number(summary.procurement.received_purchase_orders)],
      ["Ordered value", currency(summary.procurement.ordered_value)],
      ["Outstanding value", currency(summary.procurement.outstanding_value)],
    ],
    y
  );

  // Evidence-based recommendations
  y = addSectionTitle(doc, "Recommended management actions", y);

  const recommendations: string[] = [];

  if (report.overdue_order_count > 0) {
    recommendations.push(
      `Review ${report.overdue_order_count} overdue order(s), confirm revised delivery commitments and assign recovery actions.`
    );
  }

  if (report.delayed_schedule_count > 0) {
    recommendations.push(
      `Review ${report.delayed_schedule_count} delayed production schedule(s) and rebalance stage capacity against planned quantities.`
    );
  }

  if (report.material_issues.length > 0) {
    recommendations.push(
      `Review ${report.material_issues.length} material shortage(s) and prioritize replenishment based on production requirements.`
    );
  }

  if (report.late_purchase_order_count > 0) {
    recommendations.push(
      `Contact suppliers regarding ${report.late_purchase_order_count} late purchase order(s) and confirm updated delivery dates.`
    );
  }

  if (report.machine_attention_count > 0) {
    recommendations.push(
      `Review ${report.machine_attention_count} machine attention item(s) and schedule the required maintenance or operational checks.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "No immediate corrective action is indicated by the current report findings. Continue routine monitoring."
    );
  }

  recommendations.forEach((item, index) => {
    y = addParagraph(doc, `${index + 1}. ${item}`, y);
  });

  // Source note
  y = Math.min(y + 5, pageHeight - 55);
  doc.setFontSize(7);
  doc.setTextColor(...colors.muted);
  doc.text("Source: OrderFit local operational database", 40, y);

  // Page numbering
  const totalPages = doc.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...colors.border);
    doc.line(40, pageHeight - 30, pageWidth - 40, pageHeight - 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    doc.text("OrderFit | Factory Health Report", 40, pageHeight - 17);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - 40, pageHeight - 17, {
      align: "right",
    });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
