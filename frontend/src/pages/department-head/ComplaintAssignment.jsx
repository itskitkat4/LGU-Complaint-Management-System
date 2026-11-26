import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, inputClass, primaryBtn } from "../../components/ui";
import {
  getDepartmentHeadComplaints,
  getDepartmentPersonnel,
  assignComplaintToPersonnel,
} from "../../lib/api";

export default function ComplaintAssignment() {
  const [complaints, setComplaints] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [complaintResult, personnelResult] = await Promise.all([
          getDepartmentHeadComplaints(page),
          getDepartmentPersonnel(),
        ]);

        setComplaints(
          Array.isArray(complaintResult.data) ? complaintResult.data : []
        );

        setPagination(complaintResult.pagination || null);
        setPersonnel(personnelResult);
      } catch (err) {
        setError(err.message || "Failed to load assignment data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [page, refreshKey]);

  function openAssignModal(complaint) {
    setSelectedComplaint(complaint);
    setSelectedPersonnelId("");
    setAssignmentReason("");
  }

  function closeAssignModal() {
    if (submittingId !== null) return;
    setSelectedComplaint(null);
    setSelectedPersonnelId("");
    setAssignmentReason("");
  }

  useEffect(() => {
    if (!selectedComplaint) return undefined;

    function handleDialogKeyDown(event) {
      if (event.key === "Escape" && submittingId === null) {
        setSelectedComplaint(null);
        setSelectedPersonnelId("");
        setAssignmentReason("");
      }
    }

    window.addEventListener("keydown", handleDialogKeyDown);
    return () => window.removeEventListener("keydown", handleDialogKeyDown);
  }, [selectedComplaint, submittingId]);

  async function assign(event) {
    event.preventDefault();

    if (!selectedComplaint) return;

    const complaintId = selectedComplaint.id;
    const reason = assignmentReason.trim();

    if (!selectedPersonnelId) {
      await Swal.fire({
        title: "Select personnel",
        text: "Please select a personnel member.",
        icon: "warning",
        confirmButtonColor: "#047857",
      });
      return;
    }

    if (reason.length < 10) {
      await Swal.fire({
        title: "Assignment reason required",
        text: "Please provide at least 10 characters explaining this assignment.",
        icon: "warning",
        confirmButtonColor: "#047857",
      });
      return;
    }

    const confirmation = await Swal.fire({
      title: "Confirm assignment?",
      text: "This complaint will be assigned to the selected department personnel.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, assign",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#047857",
    });

    if (!confirmation.isConfirmed) return;

    setSubmittingId(complaintId);

    try {
      await assignComplaintToPersonnel(
        complaintId,
        selectedPersonnelId,
        reason
      );

      await Swal.fire({
        title: "Assignment successful",
        text: "The complaint has been assigned successfully.",
        icon: "success",
        confirmButtonColor: "#047857",
      });

      setSelectedComplaint(null);
      setSelectedPersonnelId("");
      setAssignmentReason("");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      await Swal.fire({
        title: "Assignment failed",
        text: err.message || "Unable to assign this complaint.",
        icon: "error",
        confirmButtonColor: "#047857",
      });
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <StaffLayout title="Complaint Assignment" role="Department Head">
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-14 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Complaint assignment
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Select qualified department personnel for each LGU-level complaint.
            </p>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="glass animate-pulse rounded-2xl p-6"
              >
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="mt-3 h-5 w-64 rounded bg-slate-200" />
                <div className="mt-6 h-10 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && complaints.length > 0 && (
          <div className="space-y-5">
            {complaints.map((complaint) => (
              <article
                key={complaint.id}
                className="glass rounded-2xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Complaint ID: {complaint.id}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      {complaint.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {complaint.category?.name || "Uncategorized"}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    Awaiting Assignment
                  </span>
                </div>

                <div className="flex justify-end border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => openAssignModal(complaint)}
                    className={primaryBtn}
                    disabled={
                      submittingId !== null ||
                      personnel.length === 0
                    }
                  >
                    Assign personnel

                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {selectedComplaint && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeAssignModal();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="assign-complaint-title"
              className="my-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Complaint ID: {selectedComplaint.id}
                  </p>
                  <h3
                    id="assign-complaint-title"
                    className="mt-1 text-lg font-semibold text-slate-900"
                  >
                    Assign department personnel
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedComplaint.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAssignModal}
                  disabled={submittingId !== null}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                  aria-label="Close assignment dialog"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={assign}>
                <div className="space-y-5 p-5 sm:p-6">
                  <div>
                    <label
                      htmlFor="assignment-personnel"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Assign to
                    </label>
                    <select
                      id="assignment-personnel"
                      value={selectedPersonnelId}
                      onChange={(event) => setSelectedPersonnelId(event.target.value)}
                      className={inputClass}
                      disabled={personnel.length === 0 || submittingId !== null}
                      required
                    >
                      <option value="">Select personnel</option>
                      {personnel.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.full_name}
                        </option>
                      ))}
                    </select>
                    {personnel.length === 0 && (
                      <p className="mt-1.5 text-xs text-amber-600">
                        No active personnel found in your department.
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="assignment-reason"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Assignment reason
                    </label>
                    <textarea
                      id="assignment-reason"
                      value={assignmentReason}
                      onChange={(event) => setAssignmentReason(event.target.value)}
                      placeholder="Explain why this personnel is assigned"
                      className={`${inputClass} resize-y`}
                      rows={4}
                      minLength={10}
                      maxLength={1000}
                      required
                      disabled={submittingId !== null}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Minimum 10 characters. Maximum 1,000.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                  <button
                    type="button"
                    onClick={closeAssignModal}
                    disabled={submittingId !== null}
                    className="glass-btn-secondary rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={primaryBtn}
                    disabled={submittingId !== null || personnel.length === 0}
                  >
                    {submittingId === selectedComplaint.id
                      ? "Assigning..."
                      : "Confirm assignment"}
                    <Icon name="arrow" className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {!loading && !error && complaints.length === 0 && (
          <div className="glass rounded-2xl px-5 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
              <Icon name="check" className="h-6 w-6" />
            </span>

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              Nothing waiting for assignment
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              New LGU-level complaints will appear here once they are routed to your department.
            </p>
          </div>
        )}

        {!loading && !error && pagination && pagination.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              Page {pagination.current_page} of {pagination.last_page}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={pagination.current_page <= 1}
                className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={pagination.current_page >= pagination.last_page}
                className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}