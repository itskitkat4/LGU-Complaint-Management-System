import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import StaffLayout from "../../layouts/StaffLayout";
import { getBarangayHeadComplaints, getDepartments, requestComplaintEscalation } from "../../lib/api";
import { Icon, inputClass, primaryBtn, StatusBadge } from "../../components/ui";

export default function AssignedComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([getBarangayHeadComplaints(page), getDepartments()])
      .then(([result, departmentList]) => {
        if (!active) return;
        setComplaints(result.data || []);
        setPagination(result.pagination || null);
        setDepartments(departmentList);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load assigned complaints.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  function openEscalation(complaint) {
    setSelected(complaint);
    setDestination("");
    setReason("");
  }

  async function submitEscalation(event) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      await Swal.fire({ title: "More details required", text: "Explain why the complaint needs LGU assistance (at least 10 characters).", icon: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      await requestComplaintEscalation(selected.id, destination, reason.trim());
      setSelected(null);
      setReloadKey((value) => value + 1);
      await Swal.fire({ title: "Escalation submitted", text: "The request was sent for LGU review.", icon: "success" });
    } catch (requestError) {
      await Swal.fire({ title: "Unable to submit escalation", text: requestError.message, icon: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StaffLayout title="Assigned Complaints" role="Barangay Head">
      <div className="space-y-6">
        <header>
          <p className="text-sm font-medium text-emerald-700">Barangay Portal</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Assigned complaints</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review complaints assigned to your barangay, track status, and request LGU help when an issue is beyond your authority.</p>
        </header>

        {loading ? (
          <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading assigned complaints…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}<button type="button" onClick={() => setReloadKey((value) => value + 1)} className="ml-3 font-semibold underline">Try again</button></div>
        ) : complaints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <Icon name="file" className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 font-semibold text-slate-900">No active complaints assigned</h3>
            <p className="mt-1 text-sm text-slate-500">Complaints routed to your barangay will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => {
              const pendingEscalation = complaint.escalations?.find((item) => item.status === "pending");
              const latestEscalation = complaint.escalations?.[0];
              return (
                <article key={complaint.id} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Complaint ID: {complaint.id}</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{complaint.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{complaint.category?.name || "Uncategorized"} · {new Date(complaint.created_at).toLocaleDateString()}</p>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{complaint.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={complaint.status} />
                        {latestEscalation && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Escalation {latestEscalation.status.replaceAll("_", " ")}
                            {latestEscalation.destination_department?.name ? ` · ${latestEscalation.destination_department.name}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <button type="button" disabled={submitting || Boolean(pendingEscalation)} onClick={() => openEscalation(complaint)} className={`${primaryBtn} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}>
                      {pendingEscalation ? "Request pending" : "Request LGU support"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination?.last_page > 1 && !loading && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Page {pagination.current_page} of {pagination.last_page} · {pagination.total} complaints</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && !submitting && setSelected(null)}>
            <section role="dialog" aria-modal="true" aria-labelledby="barangay-escalation-title" className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <form onSubmit={submitEscalation}>
                <div className="border-b border-slate-100 p-5">
                  <h3 id="barangay-escalation-title" className="text-lg font-semibold text-slate-900">Request LGU support</h3>
                  <p className="mt-1 text-sm text-slate-600">{selected.title}</p>
                </div>
                <div className="space-y-4 p-5">
                  <label className="block text-sm font-medium text-slate-700">Destination department
                    <select required value={destination} onChange={(event) => setDestination(event.target.value)} className={`${inputClass} mt-1`}>
                      <option value="">Select department</option>
                      {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">Reason for escalation
                    <textarea required minLength={10} maxLength={2000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className={`${inputClass} mt-1 resize-y`} placeholder="Explain why the complaint needs department authority or resources." />
                  </label>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                  <button type="button" disabled={submitting} onClick={() => setSelected(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                  <button type="submit" disabled={submitting} className={primaryBtn}>{submitting ? "Submitting…" : "Submit request"}</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
