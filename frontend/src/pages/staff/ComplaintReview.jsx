import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import {
  Icon,
  StatusBadge,
  focusRing,
  inputClass,
  primaryBtn,
} from "../../components/ui";
import {
  getStaffComplaint,
  reviewComplaint,
  getEligibleAssignees,
  getDepartments,
  routeComplaint,
} from "../../lib/api";

/* ---------- Small presentational helpers (UI only) ---------- */

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

function CheckIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function DecisionButton({ active, tone, title, hint, icon, onClick, disabled }) {
  const tones = {
    accept: {
      active: "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20",
      badgeActive: "bg-emerald-600 text-white",
      titleActive: "text-emerald-900",
    },
    decline: {
      active: "border-red-500 bg-red-50 ring-2 ring-red-500/20",
      badgeActive: "bg-red-600 text-white",
      titleActive: "text-red-900",
    },
  }[tone];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
        active
          ? tones.active
          : `border-slate-200 bg-white ${
              disabled ? "" : "hover:border-slate-300 hover:bg-slate-50"
            }`
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
          active
            ? tones.badgeActive
            : `bg-slate-100 text-slate-500 ${
                disabled ? "" : "group-hover:bg-slate-200"
              }`
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold ${
            active ? tones.titleActive : "text-slate-900"
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      </span>

      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          active
            ? tone === "accept"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-red-600 bg-red-600 text-white"
            : "border-slate-300 bg-white text-transparent"
        }`}
        aria-hidden="true"
      >
        <CheckIcon className="h-3 w-3" />
      </span>
    </button>
  );
}

function LevelOption({ active, title, hint, onClick, disabled }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full flex-col rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
        active
          ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
          : `border-slate-200 bg-white ${
              disabled ? "" : "hover:border-slate-300 hover:bg-slate-50"
            }`
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={`text-sm font-semibold ${
            active ? "text-emerald-900" : "text-slate-900"
          }`}
        >
          {title}
        </span>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            active
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 text-transparent"
          }`}
          aria-hidden="true"
        >
          <CheckIcon className="h-3 w-3" />
        </span>
      </span>
      <span className="mt-1 text-xs leading-5 text-slate-500">{hint}</span>
    </button>
  );
}

/* ---------- Page ---------- */

export default function ComplaintReview({ complaintId, onClose }) {
  const { id: routeId } = useParams();
  const id = complaintId || routeId;
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [decision, setDecision] = useState("accepted");
  const [resolutionLevel, setResolutionLevel] = useState("barangay");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Routing form state
  const [assignees, setAssignees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [routingReason, setRoutingReason] = useState("");
  const [routingLoading, setRoutingLoading] = useState(false);

  async function loadRoutingOptions(complaintData) {
    if (
      !["accepted", "assigned", "in_progress"].includes(
        complaintData.status
      ) ||
      !complaintData.resolution_level
    ) {
      setAssignees([]);
      setDepartments([]);
      return;
    }

    const eligible = await getEligibleAssignees(complaintData.id);
    setAssignees(eligible);

    if (complaintData.resolution_level === "lgu") {
      const departmentList = await getDepartments();
      setDepartments(departmentList);
    } else {
      setDepartments([]);
    }
  }

  useEffect(() => {
    async function loadComplaint() {
      try {
        setLoading(true);
        setError("");

        const result = await getStaffComplaint(id);
        const complaintData = result.data;
        setComplaint(complaintData);

        try {
          await loadRoutingOptions(complaintData);
        } catch (routingError) {
          setError(
            routingError.message || "Failed to load complaint routing options."
          );
        }
      } catch (err) {
        setError(err.message || "Failed to load complaint.");
      } finally {
        setLoading(false);
      }
    }

    if (id) loadComplaint();
  }, [id]);

  useEffect(() => {
    if (!onClose) return undefined;

    function handleDialogKeyDown(event) {
      if (event.key === "Escape" && !submitting && !routingLoading) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleDialogKeyDown);
    return () => window.removeEventListener("keydown", handleDialogKeyDown);
  }, [onClose, submitting, routingLoading]);

  function returnToQueue() {
    if (submitting || routingLoading) return;
    if (onClose) onClose();
    else navigate("/staff/complaints");
  }

  async function submit(event) {
    event.preventDefault();

    if (decision === "declined" && !notes.trim()) {
      setError("Please provide a reason for declining this complaint.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      await reviewComplaint(
        id,
        decision,
        decision === "accepted" ? resolutionLevel : null,
        decision === "declined" ? notes.trim() : "",
        decision === "accepted" ? notes.trim() : ""
      );

      if (decision === "accepted") {
        const updatedComplaint = {
          ...complaint,
          status: "accepted",
          resolution_level: resolutionLevel,
        };

        setComplaint(updatedComplaint);
        setSuccess(
          `Complaint accepted for ${resolutionLevel}-level handling. You can now route it.`
        );

        try {
          await loadRoutingOptions(updatedComplaint);
        } catch (routingError) {
          setError(
            routingError.message ||
              "Complaint accepted, but routing options could not be loaded."
          );
        }
      } else {
        setSuccess("Complaint declined successfully.");
        setTimeout(returnToQueue, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startReview() {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await reviewComplaint(id, "start_review");
      setComplaint((current) => ({ ...current, status: "under_review" }));
    } catch (err) {
      setError(err.message || "Failed to start complaint review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRouting(event) {
    event.preventDefault();

    if (!selectedAssigneeId) {
      setError("Please select a recipient.");
      return;
    }

    if (complaint.resolution_level === "lgu" && !selectedDepartmentId) {
      setError("Please select a department.");
      return;
    }

    if (routingReason.trim().length < 10) {
      setError("Routing reason must be at least 10 characters.");
      return;
    }

    try {
      setRoutingLoading(true);
      setError("");
      setSuccess("");

      await routeComplaint(
        id,
        selectedAssigneeId,
        routingReason.trim(),
        complaint.resolution_level === "lgu" ? selectedDepartmentId : null
      );

      setSuccess("Complaint routed successfully.");
      setTimeout(returnToQueue, 1500);
    } catch (err) {
      setError(err.message || "Failed to route complaint.");
    } finally {
      setRoutingLoading(false);
    }
  }

  const isDeclined = decision === "declined";
  const noteLimit = isDeclined ? 100 : 1000;

  // UI only: lock the form while saving and during the short redirect delay.
  const locked = submitting || Boolean(success);

  const content = (
      <div className="mx-auto max-w-4xl space-y-6">
        {onClose ? (
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                LGU Staff
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Complaint review
              </h2>
            </div>
            <button
              type="button"
              onClick={returnToQueue}
              disabled={submitting || routingLoading}
              aria-label="Close complaint review"
              className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
              <XIcon />
            </button>
          </div>
        ) : (
          <Link
            to="/staff/complaints"
            className={`inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
          >
            <Icon name="back" className="h-4 w-4" />
            Back to queue
          </Link>
        )}

        {loading && (
          <div role="status" className="space-y-6">
            <span className="sr-only">Loading complaint details...</span>

            <div aria-hidden="true" className="space-y-6">
              {/* Summary card */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="h-1 bg-slate-200" />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Skeleton className="h-6 w-32 rounded-full" />
                      <Skeleton className="mt-3 h-8 w-72 max-w-full rounded" />
                    </div>
                    <Skeleton className="h-7 w-24 rounded-full" />
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                  </div>

                  <Skeleton className="mt-6 h-4 w-40 rounded" />
                  <Skeleton className="mt-2 h-24 w-full rounded-xl" />
                </div>
              </div>

              {/* Decision form */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <Skeleton className="h-5 w-40 rounded" />
                  <Skeleton className="mt-2 h-4 w-80 max-w-full rounded" />
                </div>

                <div className="space-y-7 p-6">
                  <div>
                    <Skeleton className="mb-3 h-4 w-32 rounded" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-[76px] rounded-xl" />
                      <Skeleton className="h-[76px] rounded-xl" />
                    </div>
                  </div>

                  <div>
                    <Skeleton className="mb-3 h-4 w-56 rounded" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-24 rounded-xl" />
                      <Skeleton className="h-24 rounded-xl" />
                    </div>
                  </div>

                  <div>
                    <Skeleton className="mb-3 h-4 w-28 rounded" />
                    <Skeleton className="h-28 w-full rounded-md" />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-5">
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-40 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && !complaint && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <XIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && complaint && (
          <>
            {/* Complaint summary */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1 bg-gradient-to-r from-emerald-600 to-emerald-400" />

              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-600">
                      Ref: {complaint.id}
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                      {complaint.title}
                    </h2>
                  </div>

                  <StatusBadge status={complaint.status} />
                </div>

                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  <MetaItem
                    label="Category"
                    value={complaint.category?.name || "—"}
                  />
                  <MetaItem
                    label="Barangay"
                    value={complaint.barangay?.name || "—"}
                  />
                </dl>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Citizen's description
                  </h3>

                  <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {complaint.description || "No description provided."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Decision form */}
            {complaint.status === "submitted" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Begin review</h2>
                <p className="mt-1 text-sm text-slate-500">Mark that LGU Staff has started reviewing this complaint before recording an acceptance or decline decision.</p>
                {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
                <button type="button" onClick={startReview} disabled={submitting} className={`${primaryBtn} mt-5 disabled:opacity-60`}>
                  {submitting ? "Starting…" : "Start review"}
                </button>
              </section>
            ) : complaint.status === "under_review" ? (
              <form
                onSubmit={submit}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-base font-semibold text-slate-900">
                    Complaint Review
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assess the complaint and decide whether it should be
                    handled by the Barangay or the LGU.
                  </p>
                </div>

                <div className="space-y-7 p-6">
                  {/* Review decision */}
                  <div>
                    <p
                      id="decision-label"
                      className="mb-2 text-sm font-medium text-slate-700"
                    >
                      Review Decision
                    </p>

                    <div
                      role="radiogroup"
                      aria-labelledby="decision-label"
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      <DecisionButton
                        tone="accept"
                        active={decision === "accepted"}
                        title="Accept Complaint"
                        hint="Valid concern — route it for handling"
                        icon={<CheckIcon />}
                        disabled={locked}
                        onClick={() => {
                          setDecision("accepted");
                          setError("");
                        }}
                      />
                      <DecisionButton
                        tone="decline"
                        active={decision === "declined"}
                        title="Decline Complaint"
                        hint="Not valid — a reason is required"
                        icon={<XIcon />}
                        disabled={locked}
                        onClick={() => {
                          setDecision("declined");
                          setError("");
                        }}
                      />
                    </div>
                  </div>

                  {/* Handling level */}
                  {decision === "accepted" && (
                    <div>
                      <p
                        id="level-label"
                        className="mb-2 text-sm font-medium text-slate-700"
                      >
                        Where can this complaint be resolved?
                      </p>

                      <div
                        role="radiogroup"
                        aria-labelledby="level-label"
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <LevelOption
                          active={resolutionLevel === "barangay"}
                          title="Barangay-level"
                          hint="Handled by the Barangay Head. Best when the issue can be resolved within the concerned barangay."
                          disabled={locked}
                          onClick={() => setResolutionLevel("barangay")}
                        />
                        <LevelOption
                          active={resolutionLevel === "lgu"}
                          title="LGU-level"
                          hint="Handled by the appropriate LGU department. Choose this when department intervention is needed."
                          disabled={locked}
                          onClick={() => setResolutionLevel("lgu")}
                        />
                      </div>
                    </div>
                  )}

                  {/* Review notes / rejection reason */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="notes"
                        className="text-sm font-medium text-slate-700"
                      >
                        {isDeclined ? "Reason for Declining" : "Review Notes"}
                        {isDeclined ? (
                          <span className="ml-1 text-red-600">*</span>
                        ) : (
                          <span className="ml-1.5 text-xs font-normal text-slate-400">
                            (optional)
                          </span>
                        )}
                      </label>

                      <span
                        className={`text-xs tabular-nums ${
                          notes.length >= noteLimit * 0.9
                            ? "text-red-600"
                            : "text-slate-400"
                        }`}
                      >
                        {notes.length}/{noteLimit}
                      </span>
                    </div>

                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      required={decision === "declined"}
                      maxLength={decision === "declined" ? 100 : 1000}
                      disabled={locked}
                      placeholder={
                        decision === "declined"
                          ? "Explain why this complaint is being declined..."
                          : "Add your assessment or observations about this complaint..."
                      }
                      className={`${inputClass} resize-y disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
                    />

                    <p className="mt-1.5 text-xs text-slate-500">
                      {decision === "declined"
                        ? "A reason for declining is required (maximum 100 characters)."
                        : "Optional review notes (maximum 1000 characters)."}
                    </p>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                    >
                      <XIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div
                      role="status"
                      className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800"
                    >
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  {onClose ? (
                    <button
                      type="button"
                      onClick={returnToQueue}
                      disabled={submitting || routingLoading}
                      className={`inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                    >
                      Cancel
                    </button>
                  ) : (
                    <Link
                      to="/staff/complaints"
                      aria-disabled={submitting}
                      tabIndex={submitting ? -1 : undefined}
                      className={`inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${
                        submitting ? "pointer-events-none opacity-60" : ""
                      } ${focusRing}`}
                    >
                      Cancel
                    </Link>
                  )}

                  <button
                    type="submit"
                    disabled={locked}
                    className={
                      isDeclined
                        ? `inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`
                        : `${primaryBtn} disabled:cursor-not-allowed disabled:opacity-60`
                    }
                  >
                    {submitting
                      ? "Saving..."
                      : decision === "accepted"
                        ? "Accept Complaint"
                        : "Decline Complaint"}

                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : ["accepted", "assigned", "in_progress"].includes(
                complaint.status
              ) ? (
              <form
                onSubmit={submitRouting}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-base font-semibold text-slate-900">
                    Route Complaint
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Assign this complaint to the appropriate handling unit.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Handling Level
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-800">
                      {complaint.resolution_level === "barangay"
                        ? "Barangay-level"
                        : "LGU-level"}
                    </p>
                  </div>

                  {complaint.resolution_level === "lgu" && (
                    <div>
                      <label
                        htmlFor="department"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Select Department
                      </label>
                      <select
                        id="department"
                        value={selectedDepartmentId}
                        onChange={(event) => {
                          setSelectedDepartmentId(event.target.value);
                          setSelectedAssigneeId("");
                          setError("");
                        }}
                        required
                        className={inputClass}
                      >
                        <option value="">Choose a department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="assignee"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      {complaint.resolution_level === "barangay"
                        ? "Barangay Head"
                        : "Department Head"}
                    </label>
                    <select
                      id="assignee"
                      value={selectedAssigneeId}
                      onChange={(event) =>
                        setSelectedAssigneeId(event.target.value)
                      }
                      required
                      disabled={
                        complaint.resolution_level === "lgu" &&
                        !selectedDepartmentId
                      }
                      className={inputClass}
                    >
                      <option value="">Choose a recipient</option>
                      {assignees
                        .filter((person) =>
                          complaint.resolution_level === "barangay"
                            ? true
                            : person.department_id === selectedDepartmentId
                        )
                        .map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.full_name}
                          </option>
                        ))}
                    </select>

                    {assignees.length === 0 && (
                      <p className="mt-1.5 text-xs text-amber-700">
                        No eligible recipient found. Check that an active
                        {complaint.resolution_level === "barangay"
                          ? " Barangay Head is assigned to this barangay."
                          : " Department Head is assigned to a department."}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="routingReason"
                        className="text-sm font-medium text-slate-700"
                      >
                        Routing Reason <span className="text-red-600">*</span>
                      </label>
                      <span className="text-xs text-slate-400">
                        {routingReason.length}/1000
                      </span>
                    </div>
                    <textarea
                      id="routingReason"
                      value={routingReason}
                      onChange={(event) =>
                        setRoutingReason(event.target.value)
                      }
                      rows={4}
                      minLength={10}
                      maxLength={1000}
                      required
                      placeholder="Explain why this complaint is being assigned to this handling unit..."
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
                    >
                      {error}
                    </div>
                  )}

                  {success && (
                    <div
                      role="status"
                      className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800"
                    >
                      {success}
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-5">
                  <button
                    type="submit"
                    disabled={
                      routingLoading ||
                      !selectedAssigneeId ||
                      (complaint.resolution_level === "lgu" &&
                        !selectedDepartmentId)
                    }
                    className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {routingLoading ? "Routing..." : "Route Complaint"}
                    <Icon name="arrow" className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <p className="pt-1.5 text-sm text-slate-600">
                  This complaint has already been reviewed or is no longer
                  pending routing.
                </p>
              </div>
            )}
          </>
        )}
      </div>
  );

  if (onClose) {
    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) returnToQueue();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Review complaint"
          className="my-auto max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-2xl sm:p-6"
        >
          {content}
        </section>
      </div>
    );
  }

  return (
    <StaffLayout title="Complaint Review" role="LGU Staff">
      {content}
    </StaffLayout>
  );
}
