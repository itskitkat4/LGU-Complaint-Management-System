import { useEffect, useState } from "react";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, StatusBadge } from "../../components/ui";
import { getBarangayComplaintHistory } from "../../lib/api";
import { ContentSkeleton } from "../../components/Skeletons";

const statuses = [
  "submitted",
  "under_review",
  "accepted",
  "declined",
  "assigned",
  "in_progress",
  "resolved",
];

function formatStatus(status) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString();
}

function isComplaint(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.id === "string" &&
    typeof value.status === "string" &&
    statuses.includes(value.status) &&
    (value.title === undefined || typeof value.title === "string") &&
    (value.created_at === undefined || value.created_at === null || typeof value.created_at === "string") &&
    (value.category === undefined ||
      value.category === null ||
      (typeof value.category === "object" &&
        !Array.isArray(value.category) &&
        (value.category.name === undefined || typeof value.category.name === "string")));
}

function isPagination(value) {
  return value &&
    Number.isInteger(value.current_page) &&
    Number.isInteger(value.last_page) &&
    Number.isInteger(value.per_page) &&
    Number.isInteger(value.total) &&
    value.current_page > 0 &&
    value.last_page >= 0 &&
    value.per_page > 0 &&
    value.total >= 0;
}

function ComplaintHistoryContent({
  loading,
  error,
  retry,
  complaints,
  statusFilter,
  pagination,
  page,
  changePage,
}) {
  if (loading) {
    return <ContentSkeleton label="Loading complaint history" variant="table" rows={5} />;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
        <button type="button" onClick={retry} className="ml-3 font-semibold underline">
          Try again
        </button>
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="glass rounded-2xl px-5 py-12 text-center">
        <Icon name="history" className="mx-auto h-8 w-8 text-slate-400" />
        <h3 className="mt-3 font-semibold text-slate-900">No complaints found</h3>
        <p className="mt-1 text-sm text-slate-500">
          {statusFilter === "all"
            ? "Complaints registered for your barangay will appear here."
            : `There are no ${formatStatus(statusFilter).toLowerCase()} complaints in this barangay.`}
        </p>
      </div>
    );
  }

  return (
    <section className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Complaint history for your barangay</caption>
          <thead className="glass-soft text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {["Tracking number (complaint ID)", "Subject", "Category", "Submitted", "Status"].map((label) => (
                <th key={label} scope="col" className="px-5 py-3.5">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {complaints.map((complaint) => (
              <tr key={complaint.id} className="glass-hover">
                <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-600">{complaint.id}</td>
                <td className="px-5 py-4 font-semibold text-slate-900">{complaint.title || "Title unavailable"}</td>
                <td className="px-5 py-4 text-slate-600">{complaint.category?.name || "Uncategorized"}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(complaint.created_at)}</td>
                <td className="px-5 py-4"><StatusBadge status={formatStatus(complaint.status)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-600">
          <output>
            Page {pagination.current_page} of {pagination.last_page}
            {" · "}
            {pagination.total} complaints
          </output>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={page >= pagination.last_page} onClick={() => changePage(page + 1)} className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function BarangayComplaintHistory() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getBarangayComplaintHistory(page, statusFilter)
      .then((result) => {
        if (
          !Array.isArray(result?.data) ||
          !result.data.every(isComplaint) ||
          !isPagination(result.pagination)
        ) {
          throw new Error("The complaint history response is incomplete or invalid.");
        }

        if (active) {
          setComplaints(result.data);
          setPagination(result.pagination);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "Unable to load complaint history.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, statusFilter, reloadKey]);

  function changeStatus(event) {
    setLoading(true);
    setError("");
    setStatusFilter(event.target.value);
    setPage(1);
  }

  function changePage(nextPage) {
    setLoading(true);
    setError("");
    setPage(nextPage);
  }

  function retry() {
    setLoading(true);
    setError("");
    setReloadKey((value) => value + 1);
  }

  return (
    <StaffLayout title="Barangay Complaint History" role="Barangay Head">
      <div className="space-y-6">
        <header className="flex items-start gap-3">
          <span className="mt-1 h-16 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-emerald-700">Barangay Portal</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Complaint History
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review all complaints registered for your barangay, including cases with ended assignments and those still being handled.
            </p>
          </div>
        </header>

        <section className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            History is based on the complaint&apos;s registered barangay, not its current assignment.
          </p>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            Status
            <select
              value={statusFilter}
              onChange={changeStatus}
              aria-label="Filter complaint history by status"
              className="glass-input rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{formatStatus(status)}</option>
              ))}
            </select>
          </label>
        </section>

        <ComplaintHistoryContent
          loading={loading}
          error={error}
          retry={retry}
          complaints={complaints}
          statusFilter={statusFilter}
          pagination={pagination}
          page={page}
          changePage={changePage}
        />
      </div>
    </StaffLayout>
  );
}
