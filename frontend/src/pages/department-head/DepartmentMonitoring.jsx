import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, inputClass, primaryBtn, secondaryBtn, StatusBadge } from "../../components/ui";
import { ContentSkeleton } from "../../components/Skeletons";
import {
  getDepartmentMonitoring,
  recordDepartmentEscalationOutcome,
  requestComplaintEscalation,
} from "../../lib/api";

function formatStatus(status) {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DepartmentMonitoring() {
  const [complaints, setComplaints] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [office, setOffice] = useState("");
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMonitoring() {
      setLoading(true);
      setError("");

      try {
        const result = await getDepartmentMonitoring(page);
        if (!active) return;

        setComplaints(result.data || []);
        setPagination(result.pagination || null);
      } catch (requestError) {
        if (active) setError(requestError.message || "Unable to load department complaints.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMonitoring();
    return () => {
      active = false;
    };
  }, [page, refreshKey]);

  function openEscalation(complaint) {
    setDialog({ mode: "request", complaint });
    setOffice("");
    setReason("");
    setOutcome("");
  }

  function openOutcome(complaint, escalation) {
    setDialog({ mode: "outcome", complaint, escalation });
    setOffice("");
    setReason("");
    setOutcome("");
  }

  function closeDialog() {
    if (submitting) return;
    setDialog(null);
  }

  async function submitDialog(event) {
    event.preventDefault();
    if (!dialog) return;

    const trimmedReason = reason.trim();
    const trimmedOutcome = outcome.trim();

    if (dialog.mode === "request" && (!office.trim() || trimmedReason.length < 10)) {
      await Swal.fire({
        title: "Complete the escalation details",
        text: "Enter the higher authority office and a reason of at least 10 characters.",
        icon: "warning",
      });
      return;
    }

    if (dialog.mode === "outcome" && trimmedOutcome.length < 10) {
      await Swal.fire({
        title: "Add the outcome",
        text: "Enter at least 10 characters describing the response or decision.",
        icon: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (dialog.mode === "request") {
        await requestComplaintEscalation(
          dialog.complaint.id,
          null,
          trimmedReason,
          office.trim()
        );
      } else {
        await recordDepartmentEscalationOutcome(dialog.escalation.id, trimmedOutcome);
      }

      setDialog(null);
      setRefreshKey((current) => current + 1);
      await Swal.fire({
        title: dialog.mode === "request" ? "External escalation recorded" : "Outcome saved",
        text: dialog.mode === "request"
          ? "Record the response here after the higher authority replies."
          : "The external escalation outcome has been recorded.",
        icon: "success",
      });
    } catch (requestError) {
      await Swal.fire({
        title: "Unable to save",
        text: requestError.message || "Please try again.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StaffLayout title="Department Monitoring" role="Department Head">
      <div className="space-y-6">
        <header className="flex items-start gap-3">
          <span className="mt-1 h-16 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-emerald-700">Department Portal</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Department monitoring</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Monitor complaints assigned to your department, see the current handler and status, and record external escalation outcomes.
            </p>
          </div>
        </header>

        {loading ? (
          <ContentSkeleton label="Loading department complaints" variant="list" rows={4} />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
            <button type="button" className="ml-3 font-semibold underline" onClick={() => setRefreshKey((current) => current + 1)}>Try again</button>
          </div>
        ) : complaints.length === 0 ? (
          <div className="glass rounded-2xl px-5 py-12 text-center">
            <h3 className="font-semibold text-slate-900">No active department assignments</h3>
            <p className="mt-1 text-sm text-slate-500">Complaints routed to your department will appear here, including work assigned to personnel.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => {
              const assignee = complaint.active_assignment?.assignee;
              const escalations = complaint.escalations || [];
              const pendingEscalation = escalations.find((item) => item.status === "pending");
              const latestEscalation = escalations[0];

              return (
                <article key={complaint.id} className="glass rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Complaint {complaint.id}</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{complaint.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {complaint.category?.name || "Uncategorized"}
                        {complaint.citizen?.full_name ? ` · Submitted by ${complaint.citizen.full_name}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={formatStatus(complaint.status)} />
                  </div>

                  <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Current handler</dt>
                      <dd className="mt-1 font-medium text-slate-800">
                        {assignee?.full_name || "Unassigned"}
                        {assignee?.role === "Department_Head" ? " · Department Head" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Complaint last updated</dt>
                      <dd className="mt-1 font-medium text-slate-800">{formatDate(complaint.updated_at)}</dd>
                    </div>
                  </dl>

                  {latestEscalation && (
                    <div className="glass-soft mt-4 rounded-2xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">External escalation · {latestEscalation.higher_authority_office}</p>
                        <StatusBadge status={formatStatus(latestEscalation.status)} />
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">Reason: {latestEscalation.reason}</p>
                      {latestEscalation.outcome_notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">Outcome: {latestEscalation.outcome_notes}</p>
                      )}
                      {latestEscalation.outcome_recorded_at && (
                        <p className="mt-2 text-xs text-slate-500">Recorded {formatDate(latestEscalation.outcome_recorded_at)}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {assignee?.role === "Department_Head" && (
                      <Link to="/department/assignments" className={secondaryBtn}>
                        Assign personnel
                      </Link>
                    )}
                    {pendingEscalation ? (
                      <button type="button" className={primaryBtn} onClick={() => openOutcome(complaint, pendingEscalation)}>
                        Record external outcome
                      </button>
                    ) : ["assigned", "in_progress"].includes(complaint.status) && (
                      <button type="button" className={secondaryBtn} onClick={() => openEscalation(complaint)}>
                        Escalate to higher authority
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination?.last_page > 1 && !loading && !error && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Page {pagination.current_page} of {pagination.last_page}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= pagination.last_page} onClick={() => setPage((current) => current + 1)} className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}

        {dialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
            <section role="dialog" aria-modal="true" aria-labelledby="department-escalation-title" className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
              <form onSubmit={submitDialog}>
                <div className="border-b border-slate-100 p-5">
                  <h3 id="department-escalation-title" className="text-lg font-semibold text-slate-900">
                    {dialog.mode === "request" ? "Record external escalation" : "Record external outcome"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{dialog.complaint.title}</p>
                </div>
                <div className="space-y-4 p-5">
                  {dialog.mode === "request" ? (
                    <>
                      <label className="block text-sm font-medium text-slate-700">Higher authority office
                        <input required maxLength={255} value={office} onChange={(event) => setOffice(event.target.value)} className={`${inputClass} mt-1`} placeholder="For example, Municipal Administrator" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">Reason for escalation
                        <textarea required minLength={10} maxLength={2000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className={`${inputClass} mt-1 resize-y`} placeholder="Explain why this requires higher-authority support" />
                      </label>
                      <p className="text-xs text-slate-500">Send supporting documents to the office outside the system, then record its response here.</p>
                    </>
                  ) : (
                    <label className="block text-sm font-medium text-slate-700">Response or decision
                      <textarea required minLength={10} maxLength={2000} rows={5} value={outcome} onChange={(event) => setOutcome(event.target.value)} className={`${inputClass} mt-1 resize-y`} placeholder="Record the response and any next steps" />
                    </label>
                  )}
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                  <button type="button" disabled={submitting} onClick={closeDialog} className="glass-btn-secondary rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                  <button type="submit" disabled={submitting} className={primaryBtn}>
                    {submitting ? "Saving…" : dialog.mode === "request" ? "Record escalation" : "Save outcome"}
                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
