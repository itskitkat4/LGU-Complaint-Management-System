
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import StaffLayout from "../../layouts/StaffLayout";
import {
  getStaffReports,
  createStaffReport,
  uploadStaffReportPdf,
} from "../../lib/api";

function SummaryCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>
        {value ?? 0}
      </p>
    </div>
  );
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function downloadReportsPDF(report, dateFrom, dateTo) {
  if (!report) return null;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const generatedDate = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // PDF Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("BantaySerbisyo", 14, 20);

  doc.setFontSize(14);
  doc.text("Consolidated Reports & Analytics", 14, 29);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("LGU Complaint Management System", 14, 36);
  doc.text(`Generated: ${generatedDate}`, 14, 42);
  doc.text(`Coverage: ${dateFrom} to ${dateTo}`, 14, 47);

  const tableRows = [];

  // Summary
  tableRows.push(
    ["SUMMARY", "Total Complaints", report.total_complaints ?? 0, "-", "-"],
    ["SUMMARY", "Pending", report.pending ?? 0, "-", "-"],
    ["SUMMARY", "In Progress", report.in_progress ?? 0, "-", "-"],
    ["SUMMARY", "Resolved", report.resolved ?? 0, "-", "-"],
    ["SUMMARY", "Declined", report.declined ?? 0, "-", "-"]
  );

  // Category breakdown
  (report.categories ?? []).forEach((item) => {
    tableRows.push([
      "CATEGORY",
      item.name ?? "Uncategorized",
      item.total ?? 0,
      "-",
      "-",
    ]);
  });

  // Monthly breakdown
  (report.monthly ?? []).forEach((item) => {
    tableRows.push([
      "MONTHLY",
      item.month ?? "",
      "-",
      item.received ?? 0,
      item.resolved ?? 0,
    ]);
  });

  autoTable(doc, {
    startY: 53,
    head: [[
      "Section",
      "Metric",
      "Total",
      "Received",
      "Resolved",
    ]],
    body: tableRows.length
      ? tableRows
      : [["SUMMARY", "No report data available", 0, 0, 0]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 3,
      valign: "middle",
    },
    headStyles: {
      fillColor: [21, 128, 61],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 65 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 30, halign: "center" },
    },
    margin: {
      left: 14,
      right: 14,
      bottom: 18,
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 0) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Page numbering
  const pageCount = doc.internal.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);

    doc.text(
      `BantaySerbisyo | Page ${page} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  return doc;
}

export default function StaffReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const initialDateFrom = (() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 5);
    date.setDate(1);
    return getLocalDateString(date);
  })();

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(getLocalDateString());

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getStaffReports();
        setReports(data);
      } catch (err) {
        setError(err.message || "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  async function handleGenerateReport() {
    setError("");

    if (!dateFrom || !dateTo) {
      setError("Please select both date ranges.");
      return;
    }

    if (dateFrom > dateTo) {
      setError("The start date must not be later than the end date.");
      return;
    }

    setGenerating(true);

    try {
      // Create report using backend
     const result = await createStaffReport(dateFrom, dateTo);

// Laravel returns the report inside result.report.
const report = result?.report ?? result;

if (!report?.id) {
    console.error("Report API response:", result);

    throw new Error(
        "Report generation failed. No report ID returned."
    );
}

      // Generate PDF document
      const doc = downloadReportsPDF(report, dateFrom, dateTo);

      if (!doc) {
        throw new Error("Unable to generate PDF document.");
      }

      const filename =
        `BantaySerbisyo-Report-${dateFrom}-to-${dateTo}.pdf`;

      // Convert PDF to Blob
      const pdfBlob = doc.output("blob");

      // Upload PDF to Supabase Storage
      await uploadStaffReportPdf(report.id, pdfBlob, filename);

      // Download locally after successful upload
      doc.save(filename);

      // Refresh dashboard summary
      const updatedReports = await getStaffReports();
      setReports(updatedReports);

      alert("Report generated, uploaded, and downloaded successfully!");
    } catch (err) {
      setError(
        err.message || "An error occurred while generating the report."
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <StaffLayout title="Reports & Analytics">
      <div className="staff-reports-page space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Reports & Analytics
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Overview of complaints handled by the municipality.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Generated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Date Range & Generate Report */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">
            Generate Consolidated Report
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Select a date range to generate, upload, and download the PDF report.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="dateFrom"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Date From
              </label>

              <input
                id="dateFrom"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={generating}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="dateTo"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Date To
              </label>

              <input
                id="dateTo"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                max={getLocalDateString()}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={generating}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={loading || generating || !reports || !!error}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate & Download PDF"
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <p className="text-sm text-slate-500">
            Loading reports...
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError("")}
              className="mt-2 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard */}
        {reports && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Complaints"
                value={reports.summary?.total}
                color="text-slate-900"
              />

              <SummaryCard
                label="Pending"
                value={reports.summary?.pending}
                color="text-amber-600"
              />

              <SummaryCard
                label="In Progress"
                value={reports.summary?.in_progress}
                color="text-blue-600"
              />

              <SummaryCard
                label="Resolved"
                value={reports.summary?.resolved}
                color="text-emerald-600"
              />
            </div>

            {/* Status and Category */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Status */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">
                  Complaints by Status
                </h3>

                <div className="mt-5 space-y-4">
                  {reports.by_status?.map((item) => {
                    const percentage = reports.summary?.total
                      ? (item.total / reports.summary.total) * 100
                      : 0;

                    return (
                      <div key={item.status}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="capitalize text-slate-600">
                            {item.status.replaceAll("_", " ")}
                          </span>

                          <span className="font-semibold text-slate-800">
                            {item.total}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Category */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">
                  Complaints by Category
                </h3>

                <div className="mt-5 space-y-4">
                  {reports.by_category?.length ? (
                    reports.by_category.map((item) => {
                      const percentage = reports.summary?.total
                        ? (item.total / reports.summary.total) * 100
                        : 0;

                      return (
                        <div key={item.category}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-600">
                              {item.category}
                            </span>

                            <span className="font-semibold text-slate-800">
                              {item.total}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">
                      No category data available.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Monthly Complaints */}
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">
                Monthly Complaints
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Complaints received versus resolved over the last six months.
              </p>

              <div className="mt-6 space-y-5">
                {reports.monthly?.map((item) => {
                  const max = Math.max(
                    1,
                    ...reports.monthly.map((month) =>
                      Math.max(month.received, month.resolved)
                    )
                  );

                  return (
                    <div key={item.month}>
                      <p className="mb-2 text-sm font-medium text-slate-700">
                        {item.month}
                      </p>

                      <div className="space-y-2">
                        {/* Received */}
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-xs text-slate-500">
                            Received
                          </span>

                          <div className="h-3 flex-1 rounded-full bg-slate-100">
                            <div
                              className="h-3 rounded-full bg-blue-600"
                              style={{
                                width: `${(item.received / max) * 100}%`,
                              }}
                            />
                          </div>

                          <span className="w-8 text-right text-xs font-semibold">
                            {item.received}
                          </span>
                        </div>

                        {/* Resolved */}
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-xs text-slate-500">
                            Resolved
                          </span>

                          <div className="h-3 flex-1 rounded-full bg-slate-100">
                            <div
                              className="h-3 rounded-full bg-emerald-600"
                              style={{
                                width: `${(item.resolved / max) * 100}%`,
                              }}
                            />
                          </div>

                          <span className="w-8 text-right text-xs font-semibold">
                            {item.resolved}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </StaffLayout>
  );
}
