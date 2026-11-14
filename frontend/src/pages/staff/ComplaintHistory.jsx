import { useEffect, useMemo, useState } from "react";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, StatusBadge } from "../../components/ui";
import { getStaffComplaint, getStaffComplaintHistory } from "../../lib/api";

const formatStatus = (status = "unknown") =>
  status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString();
};

export default function ComplaintHistory() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getStaffComplaintHistory(page)
      .then((result) => {
        if (!active) return;
        setComplaints(result.data || []);
        setPagination(result.pagination || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load complaint history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, reloadKey]);

  const statuses = useMemo(
    () => [...new Set(complaints.map((complaint) => complaint.status))].sort(),
    [complaints]
  );

  const visibleComplaints = complaints.filter((complaint) => {
    const text = `${complaint.id} ${complaint.title} ${complaint.category?.name || ""} ${complaint.barangay?.name || ""}`.toLowerCase();
    return text.includes(search.toLowerCase()) &&
      (statusFilter === "all" || complaint.status === statusFilter);
  });

  async function openDetails(complaintId) {
    setSelected(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      const result = await getStaffComplaint(complaintId);
      setSelected(result.data);
    } catch (requestError) {
      setDetailsError(requestError.message || "Unable to load complaint details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <StaffLayout title="Complaint History" role="LGU Staff">
      <div className="space-y-6">
        <header>
          <p className="text-sm font-medium text-emerald-700">LGU Staff Portal</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Complaint History</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review complaints that have moved beyond initial review, including routed, resolved, and declined cases.</p>
        </header>

        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ID, title, category, or barangay"
            aria-label="Search complaint history"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:flex-1"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter complaint history by status"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:w-52"
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </select>
        </section>

        {loading ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading complaint history…</div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}<button type="button" onClick={() => setReloadKey((value) => value + 1)} className="ml-3 font-semibold underline">Try again</button>
          </div>
        ) : visibleComplaints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <Icon name="history" className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 font-semibold text-slate-900">{complaints.length ? "No matching complaints" : "No complaint history yet"}</h3>
            <p className="mt-1 text-sm text-slate-500">{complaints.length ? "Try a different search or status filter." : "Complaints will appear here after they leave the initial review queue."}</p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <caption className="sr-only">Previously reviewed complaints</caption>
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>{["Complaint", "Category", "Barangay", "Last updated", "Status", ""].map((label) => <th key={label || "action"} scope="col" className="px-5 py-3.5">{label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleComplaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4"><p className="font-semibold text-slate-900">{complaint.title}</p><p className="mt-1 text-xs text-slate-500">{complaint.id}</p></td>
                      <td className="px-5 py-4 text-slate-600">{complaint.category?.name || "Uncategorized"}</td>
                      <td className="px-5 py-4 text-slate-600">{complaint.barangay?.name || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(complaint.updated_at)}</td>
                      <td className="px-5 py-4"><StatusBadge status={formatStatus(complaint.status)} /></td>
                      <td className="px-5 py-4"><button type="button" onClick={() => openDetails(complaint.id)} className="font-semibold text-emerald-800 hover:underline">View details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-600">
                <span>Page {pagination.current_page} of {pagination.last_page} · {pagination.total} complaints</span>
                <div className="flex gap-2">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Previous</button>
                  <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </section>
        )}

        {(detailsLoading || detailsError || selected) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
            <section role="dialog" aria-modal="true" aria-labelledby="history-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 p-5">
                <div><h3 id="history-details-title" className="text-lg font-semibold text-slate-900">Complaint details</h3><p className="mt-1 text-sm text-slate-500">Read-only history view</p></div>
                <button type="button" onClick={() => { setSelected(null); setDetailsError(""); }} className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100" aria-label="Close details">✕</button>
              </div>
              {detailsLoading ? <p role="status" className="p-6 text-sm text-slate-500">Loading complaint details…</p> : detailsError ? <p role="alert" className="p-6 text-sm text-red-700">{detailsError}</p> : selected && (
                <div className="space-y-5 p-5">
                  <div><p className="text-xs text-slate-500">{selected.id}</p><h4 className="mt-1 text-xl font-semibold text-slate-900">{selected.title}</h4><div className="mt-3"><StatusBadge status={formatStatus(selected.status)} /></div></div>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-slate-500">Category</dt><dd className="mt-1 text-sm text-slate-900">{selected.category?.name || "Uncategorized"}</dd></div>
                    <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-slate-500">Barangay</dt><dd className="mt-1 text-sm text-slate-900">{selected.barangay?.name || "—"}</dd></div>
                    <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-slate-500">Handling level</dt><dd className="mt-1 text-sm capitalize text-slate-900">{selected.resolution_level || "Not set"}</dd></div>
                    <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase text-slate-500">Submitted</dt><dd className="mt-1 text-sm text-slate-900">{formatDate(selected.created_at)}</dd></div>
                  </dl>
                  <div><h4 className="text-sm font-semibold text-slate-900">Description</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.description}</p></div>
                  {selected.rejection_reason && <div className="rounded-lg border border-red-100 bg-red-50 p-4"><h4 className="text-sm font-semibold text-red-900">Rejection reason</h4><p className="mt-1 whitespace-pre-wrap text-sm text-red-800">{selected.rejection_reason}</p></div>}
                  {selected.attachments?.length > 0 && <div><h4 className="text-sm font-semibold text-slate-900">Supporting files</h4><ul className="mt-2 list-inside list-disc text-sm text-slate-600">{selected.attachments.map((file) => <li key={file.id}>{file.file_name}</li>)}</ul></div>}
                </div>
              )}
              <div className="flex justify-end border-t border-slate-100 p-5"><button type="button" onClick={() => { setSelected(null); setDetailsError(""); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Close</button></div>
            </section>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
