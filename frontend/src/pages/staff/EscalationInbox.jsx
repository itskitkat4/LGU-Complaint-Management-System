import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import StaffLayout from "../../layouts/StaffLayout";
import { getDepartments, getStaffEscalations, reviewStaffEscalation } from "../../lib/api";
import { inputClass, primaryBtn } from "../../components/ui";

export default function EscalationInbox() {
  const [escalations, setEscalations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState("accepted");
  const [destination, setDestination] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

 useEffect(() => {
  let active = true;

  Promise.all([getStaffEscalations(page), getDepartments()])
      .then(([result, departmentList]) => {
  if (!active) return;

  setError("");
  setEscalations(result.data || []);
  setPagination(result.pagination || null);
  setDepartments(departmentList);
  })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load escalation requests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  function openReview(item, choice) {
    setSelected(item);
    setDecision(choice);
    setDestination(item.destination_department_id || "");
    setComment("");
  }

  async function submitReview(event) {
    event.preventDefault();
    if (comment.trim().length < 10) {
      await Swal.fire({ title: "Add a review comment", text: "Enter at least 10 characters.", icon: "warning" });
      return;
    }
    if (decision === "redirected" && !destination) {
      await Swal.fire({ title: "Choose a department", icon: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      await reviewStaffEscalation(selected.id, {
        decision,
        review_comment: comment.trim(),
        ...(decision === "redirected" ? { destination_department_id: destination } : {}),
      });
      setSelected(null);
      setReloadKey((value) => value + 1);
      await Swal.fire({ title: "Request reviewed", text: "The complaint has been routed to its department head.", icon: "success" });
    } catch (requestError) {
      await Swal.fire({ title: "Review failed", text: requestError.message, icon: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StaffLayout title="Escalation Requests" role="LGU Staff">
      <div className="space-y-6">
        <header>
          <p className="text-sm font-medium text-emerald-700">LGU Staff Portal</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Escalation requests</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Review requests from Barangay Heads. Accept the requested department or redirect the complaint to another department; the receiving Department Head will see it in their complaint queue.</p>
        </header>

        {loading ? <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading escalation requests…</p> : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}<button type="button" className="ml-3 font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>Try again</button>
          </div>
        ) : escalations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <h3 className="font-semibold text-slate-900">No pending escalation requests</h3>
            <p className="mt-1 text-sm text-slate-500">New requests from Barangay Heads will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {escalations.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">Complaint {item.complaint?.id || item.complaint_id}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.complaint?.title || "Complaint details unavailable"}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.complaint?.category?.name || "Uncategorized"} · From {item.origin_barangay?.name || "Barangay"}</p>
                    <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Requested department:</span> {item.destination_department?.name || "Not specified"}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.reason}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:w-36">
                    <button type="button" onClick={() => openReview(item, "accepted")} className={primaryBtn}>Accept</button>
                    <button type="button" onClick={() => openReview(item, "redirected")} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Redirect</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {pagination?.last_page > 1 && !loading && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Page {pagination.current_page} of {pagination.last_page}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && !submitting && setSelected(null)}>
            <section role="dialog" aria-modal="true" aria-labelledby="review-escalation-title" className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <form onSubmit={submitReview}>
                <div className="border-b border-slate-100 p-5">
                  <h3 id="review-escalation-title" className="text-lg font-semibold text-slate-900">{decision === "accepted" ? "Accept request" : "Redirect request"}</h3>
                  <p className="mt-1 text-sm text-slate-500">Record why you made this routing decision.</p>
                </div>
                <div className="space-y-4 p-5">
                  {decision === "redirected" && (
                    <label className="block text-sm font-medium text-slate-700">Destination department
                      <select required value={destination} onChange={(event) => setDestination(event.target.value)} className={`${inputClass} mt-1`}>
                        <option value="">Select department</option>
                        {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="block text-sm font-medium text-slate-700">Review comment
                    <textarea required minLength={10} maxLength={1000} rows={4} value={comment} onChange={(event) => setComment(event.target.value)} className={`${inputClass} mt-1 resize-y`} placeholder="Explain this decision (at least 10 characters)" />
                  </label>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                  <button type="button" disabled={submitting} onClick={() => setSelected(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                  <button type="submit" disabled={submitting} className={primaryBtn}>{submitting ? "Saving…" : "Submit review"}</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
