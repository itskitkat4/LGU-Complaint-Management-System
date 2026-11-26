import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import {
  Icon,
  focusRing,
} from "../../components/ui";
import {
  getStaffComplaint,
  reviewComplaint,
  getEligibleAssignees,
  getDepartments,
  routeComplaint,
} from "../../lib/api";

import { Skeleton, XIcon } from "./ComplaintReviewComponents";
import { ComplaintSummaryCard, ComplaintActionPanels } from "./ComplaintReviewPanels";

/* ---------- Page ---------- */

export default function ComplaintReview({ complaintId, onClose }) {
  const { id: routeId } = useParams();
  const id = complaintId || routeId;
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [decision, setDecision] = useState("accepted");
  const [resolutionLevel, setResolutionLevel] = useState("barangay");
  const [priority, setPriority] = useState("medium");
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
        setPriority(complaintData.priority || "medium");

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

      const result = await reviewComplaint(
        id,
        decision,
        decision === "accepted" ? resolutionLevel : null,
        decision === "declined" ? notes.trim() : "",
        decision === "accepted" ? notes.trim() : "",
        priority
      );

      if (decision === "accepted") {
        const updatedComplaint = {
          ...complaint,
          ...(result.complaint || {}),
          status: "accepted",
          resolution_level: resolutionLevel,
          priority,
        };

        setComplaint(updatedComplaint);
        setPriority(updatedComplaint.priority);
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
        if (result.complaint) {
          setComplaint(result.complaint);
          setPriority(result.complaint.priority);
        }
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
      const result = await reviewComplaint(
        id,
        "start_review",
        null,
        "",
        "",
        priority
      );
      setComplaint(result.complaint);
      setPriority(result.complaint.priority);
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
            <div className="flex items-start gap-3">
              <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  LGU Staff
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Complaint review
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={returnToQueue}
              disabled={submitting || routingLoading}
              aria-label="Close complaint review"
              className={`rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
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
              <div className="glass overflow-hidden rounded-2xl">
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
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                  </div>

                  <Skeleton className="mt-6 h-4 w-40 rounded" />
                  <Skeleton className="mt-2 h-24 w-full rounded-xl" />
                </div>
              </div>

              {/* Decision form */}
              <div className="glass overflow-hidden rounded-2xl">
                <div className="border-b border-slate-100 px-6 py-5">
                  <Skeleton className="h-5 w-40 rounded" />
                  <Skeleton className="mt-2 h-4 w-80 max-w-full rounded" />
                </div>

                <div className="space-y-7 p-6">
                  <div>
                    <Skeleton className="mb-3 h-4 w-32 rounded" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-[76px] rounded-2xl" />
                      <Skeleton className="h-[76px] rounded-2xl" />
                    </div>
                  </div>

                  <div>
                    <Skeleton className="mb-3 h-4 w-56 rounded" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-24 rounded-2xl" />
                      <Skeleton className="h-24 rounded-2xl" />
                    </div>
                  </div>

                  <div>
                    <Skeleton className="mb-3 h-4 w-28 rounded" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-5">
                  <Skeleton className="h-10 w-24 rounded-xl" />
                  <Skeleton className="h-10 w-40 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && !complaint && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <XIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && complaint && (
          <>
            <ComplaintSummaryCard complaint={complaint} />

            <ComplaintActionPanels
              complaint={complaint}
              priority={priority}
              setPriority={setPriority}
              submitting={submitting}
              error={error}
              setError={setError}
              success={success}
              startReview={startReview}
              submit={submit}
              decision={decision}
              setDecision={setDecision}
              resolutionLevel={resolutionLevel}
              setResolutionLevel={setResolutionLevel}
              notes={notes}
              setNotes={setNotes}
              isDeclined={isDeclined}
              noteLimit={noteLimit}
              locked={locked}
              onClose={onClose}
              returnToQueue={returnToQueue}
              routingLoading={routingLoading}
              submitRouting={submitRouting}
              selectedDepartmentId={selectedDepartmentId}
              setSelectedDepartmentId={setSelectedDepartmentId}
              departments={departments}
              selectedAssigneeId={selectedAssigneeId}
              setSelectedAssigneeId={setSelectedAssigneeId}
              assignees={assignees}
              routingReason={routingReason}
              setRoutingReason={setRoutingReason}
            />

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
          className="app-bg my-auto max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 p-4 shadow-2xl sm:p-6"
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
