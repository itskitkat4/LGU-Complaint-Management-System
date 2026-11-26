import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { getAdminComplaints } from "../../lib/api";
import { SkeletonBlock } from "../../components/Skeletons";

export default function AdminComplaints() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAdminComplaints(page)
      .then((response) => {
        if (active) {
          setResult(response);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load complaints.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page]);

  return (
    <AdminLayout title="Complaints">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Complaint records</h1>
            <p className="mt-1 text-sm text-slate-600">Authorized administrative view, including the identity of anonymous complainants.</p>
          </div>
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <div className="glass overflow-x-auto rounded-2xl">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="glass-soft text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Complaint</th>
                <th className="px-4 py-3">Complainant</th>
                <th className="px-4 py-3">Anonymous</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr role="status" aria-label="Loading complaint records">
                  <td className="px-4 py-5" colSpan={5}>
                    <span className="sr-only">Loading complaints...</span>
                    <div aria-hidden="true" className="space-y-4">
                      {Array.from({ length: 5 }).map((_, row) => (
                        <div key={row} className="flex gap-4">
                          <SkeletonBlock className="h-4 w-1/4" />
                          <SkeletonBlock className="h-4 w-1/5" />
                          <SkeletonBlock className="h-4 w-1/6" />
                          <SkeletonBlock className="h-4 w-1/6" />
                          <SkeletonBlock className="h-4 w-1/6" />
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : result?.data?.length ? result.data.map((complaint) => (
                <tr key={complaint.id} className="glass-hover">
                  <td className="px-4 py-3"><span className="block font-medium text-slate-900">{complaint.title}</span><span className="text-xs text-slate-500">{complaint.id}</span></td>
                  <td className="px-4 py-3"><span className="block text-slate-900">{complaint.citizen?.full_name || "Unknown"}</span><span className="text-xs text-slate-500">{complaint.citizen?.email || complaint.citizen_id}</span></td>
                  <td className="px-4 py-3">{complaint.is_anonymous ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 capitalize">{complaint.status?.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{complaint.created_at ? new Date(complaint.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              )) : (
                <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No complaints found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {result?.pagination?.current_page || page} of {result?.pagination?.last_page || 1}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page <= 1} className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40">Previous</button>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || page >= (result?.pagination?.last_page || 1)} className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
