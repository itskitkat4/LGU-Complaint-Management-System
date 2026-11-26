import { useEffect, useState } from "react";
import { getStaffComplaints } from "../../lib/api";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, StatusBadge, focusRing } from "../../components/ui";
import ComplaintReview from "./ComplaintReview";

const headings = ["Complaint", "Category", "Barangay", "Date Submitted", "Status", "Action"];

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ComplaintQueue() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadComplaints() {
      try {
        setLoading(true);
        setError("");

        const result = await getStaffComplaints();

        setComplaints(result.data || []);
      } catch (err) {
        setError(err.message || "Failed to load complaints.");
      } finally {
        setLoading(false);
      }
    }

    loadComplaints();
  }, [refreshKey]);

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-12 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Complaint Queue
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review complaints submitted by citizens.
            </p>
          </div>
        </div>

        {loading && (
          <section className="glass overflow-hidden rounded-2xl">
            <div role="status" className="overflow-x-auto">
              <span className="sr-only">Loading complaints...</span>

              <table
                className="w-full min-w-[800px] text-left text-sm"
                aria-hidden="true"
              >
                <thead className="glass-soft text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {headings.map((heading) => (
                      <th key={heading} className="px-5 py-3.5">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-48 rounded" />
                        <Skeleton className="mt-2 h-3 w-32 rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-28 rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-20 rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-14 rounded" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!loading && !error && complaints.length === 0 && (
          <div className="glass rounded-2xl px-5 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
              <Icon name="file" className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-900">
              No complaints pending review.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              New citizen submissions will appear here.
            </p>
          </div>
        )}

        {!loading && !error && complaints.length > 0 && (
          <section className="glass overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <caption className="sr-only">Complaints pending review</caption>

                <thead className="glass-soft text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {headings.map((heading) => (
                      <th key={heading} scope="col" className="px-5 py-3.5">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {complaints.map((complaint) => (
                    <tr
                      key={complaint.id}
                      className="glass-hover"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {complaint.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {complaint.id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {complaint.category?.name || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {complaint.barangay?.name || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {complaint.created_at
                          ? new Date(complaint.created_at).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={complaint.status} />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedComplaintId(complaint.id)}
                          className={`inline-flex items-center gap-1 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
                        >
                          Review <Icon name="arrow" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {selectedComplaintId && (
          <ComplaintReview
            complaintId={selectedComplaintId}
            onClose={() => {
              setSelectedComplaintId(null);
              setRefreshKey((current) => current + 1);
            }}
          />
        )}
      </div>
    </StaffLayout>
  );
}