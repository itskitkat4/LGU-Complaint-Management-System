import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import StaffLayout from "../../layouts/StaffLayout";
import { ContentSkeleton } from "../../components/Skeletons";
import {
  getBarangayHeadComplaints,
  getDepartments,
  requestComplaintEscalation,
  startBarangayHeadWork,
  submitComplaintResolution,
} from "../../lib/api";
import {
  Icon,
  inputClass,
  primaryBtn,
  StatusBadge,
} from "../../components/ui";

export default function AssignedComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Escalation states
  const [selected, setSelected] = useState(null);
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Resolution states
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [resolutionDescription, setResolutionDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [beforePhoto, setBeforePhoto] = useState(null);
  const [completedAt, setCompletedAt] = useState("");
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // General states
  const [reloadKey, setReloadKey] = useState(0);
  const [startingComplaintId, setStartingComplaintId] = useState(null);

  useEffect(() => {
    let active = true;

    void Promise.resolve()
      .then(() => {
        if (!active) return null;

        setLoading(true);
        setError("");

        return Promise.all([
          getBarangayHeadComplaints(page),
          getDepartments(),
        ]);
      })
      .then((results) => {
        if (!active || !results) return;

        const [result, departmentList] = results;

        setComplaints(result.data || []);
        setPagination(result.pagination || null);
        setDepartments(departmentList);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.message || "Unable to load assigned complaints."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  // Start handling a complaint
  async function startWork(complaint) {
    const confirmation = await Swal.fire({
      title: "Start working on this complaint?",
      text: "The complaint status will change to In Progress.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Start Work",
      cancelButtonText: "Cancel",
    });

    if (!confirmation.isConfirmed) return;

    setStartingComplaintId(complaint.id);

    try {
      await startBarangayHeadWork(complaint.id);

      setReloadKey((value) => value + 1);

      await Swal.fire({
        title: "Work started!",
        text: "The complaint is now In Progress.",
        icon: "success",
      });
    } catch (requestError) {
      await Swal.fire({
        title: "Unable to start work",
        text: requestError.message,
        icon: "error",
      });
    } finally {
      setStartingComplaintId(null);
    }
  }

  // Open escalation modal
  function openEscalation(complaint) {
    setSelected(complaint);
    setDestination("");
    setReason("");
  }

  // Submit escalation
  async function submitEscalation(event) {
    event.preventDefault();

    if (reason.trim().length < 10) {
      await Swal.fire({
        title: "More details required",
        text: "Explain why the complaint needs LGU assistance (at least 10 characters).",
        icon: "warning",
      });
      return;
    }

    setSubmitting(true);

    try {
      await requestComplaintEscalation(
        selected.id,
        destination,
        reason.trim()
      );

      setSelected(null);
      setReloadKey((value) => value + 1);

      await Swal.fire({
        title: "Escalation submitted",
        text: "The request was sent for LGU review.",
        icon: "success",
      });
    } catch (requestError) {
      await Swal.fire({
        title: "Unable to submit escalation",
        text: requestError.message,
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Open resolution modal
  function openResolution(complaint) {
    setSelectedResolution(complaint);
    setResolutionDescription("");
    setEvidenceFiles([]);
    setBeforePhoto(null);
    setCompletedAt(new Date().toISOString().slice(0, 10));
  }

  async function handleResolutionPhotoChange(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      await Swal.fire({
        title: "Invalid photo",
        text: "Choose a JPG, PNG, or WebP photo up to 10 MB.",
        icon: "warning",
      });
      return;
    }

    setBeforePhoto(file);
  }

  // Handle evidence selection
  async function handleEvidenceChange(event) {
    const files = Array.from(event.target.files || []);

    if (files.length > 5) {
      await Swal.fire({
        title: "Too many attachments",
        text: "You can upload a maximum of 5 evidence files.",
        icon: "warning",
      });

      event.target.value = "";
      setEvidenceFiles([]);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    const invalidFile = files.find(
      (file) =>
        !allowedTypes.includes(file.type) ||
        file.size > 10 * 1024 * 1024
    );

    if (invalidFile) {
      await Swal.fire({
        title: "Invalid evidence file",
        text: "Only JPG, PNG, and PDF files up to 10MB each are allowed.",
        icon: "warning",
      });

      event.target.value = "";
      setEvidenceFiles([]);
      return;
    }

    setEvidenceFiles(files);
  }

  // Submit complaint resolution
  async function handleResolutionSubmit(event) {
    event.preventDefault();

    if (resolutionDescription.trim().length < 10) {
      await Swal.fire({
        title: "More details required",
        text: "The resolution description must contain at least 10 characters.",
        icon: "warning",
      });
      return;
    }

    if (evidenceFiles.length > 5) {
      await Swal.fire({
        title: "Too many attachments",
        text: "You can upload a maximum of 5 evidence files.",
        icon: "warning",
      });
      return;
    }

    if (!beforePhoto) {
      await Swal.fire({
        title: "Before photo required",
        text: "Add a before photo to document the complaint.",
        icon: "warning",
      });
      return;
    }

    if (evidenceFiles.length === 0) {
      await Swal.fire({
        title: "Supporting evidence required",
        text: "Attach at least one supporting evidence file with your resolution.",
        icon: "warning",
      });
      return;
    }

    setSubmittingResolution(true);

    try {
      await submitComplaintResolution(
        selectedResolution.id,
        resolutionDescription.trim(),
        beforePhoto,
        completedAt,
        evidenceFiles
      );

      setSelectedResolution(null);
      setResolutionDescription("");
      setEvidenceFiles([]);
      setBeforePhoto(null);

      setReloadKey((value) => value + 1);

      await Swal.fire({
        title: "Resolution submitted!",
        text: "Your resolution has been sent to LGU Staff for review.",
        icon: "success",
      });
    } catch (requestError) {
      await Swal.fire({
        title: "Unable to submit resolution",
        text: requestError.message,
        icon: "error",
      });
    } finally {
      setSubmittingResolution(false);
    }
  }

  return (
    <StaffLayout title="Assigned Complaints" role="Barangay Head">
      <div className="space-y-6">
        <header className="flex items-start gap-3">
          <span className="mt-1 h-16 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Barangay Portal
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Assigned complaints
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review complaints assigned to your barangay, track status,
              submit resolutions, and request LGU help when an issue is
              beyond your authority.
            </p>
          </div>
        </header>

        {loading ? (
          <ContentSkeleton label="Loading assigned complaints" variant="list" rows={4} />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}

            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="ml-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        ) : complaints.length === 0 ? (
          <div className="glass rounded-2xl px-5 py-12 text-center">
            <Icon
              name="file"
              className="mx-auto h-8 w-8 text-slate-400"
            />

            <h3 className="mt-3 font-semibold text-slate-900">
              No active complaints assigned
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Complaints routed to your barangay will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint) => {
              const pendingEscalation = complaint.escalations?.find(
                (item) => item.status === "pending"
              );

              const latestEscalation = complaint.escalations?.[0];

              return (
                <article
                  key={complaint.id}
                  className="glass rounded-2xl p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Complaint ID: {complaint.id}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {complaint.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {complaint.category?.name || "Uncategorized"} ·{" "}
                        {new Date(
                          complaint.created_at
                        ).toLocaleDateString()}
                      </p>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                        {complaint.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={complaint.status} />

                        {latestEscalation && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Escalation{" "}
                            {latestEscalation.status.replaceAll("_", " ")}
                            {latestEscalation.destination_department?.name
                              ? ` · ${latestEscalation.destination_department.name}`
                              : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {complaint.status === "assigned" && (
                        <button
                          type="button"
                          disabled={startingComplaintId !== null || submitting}
                          onClick={() => startWork(complaint)}
                          className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {startingComplaintId === complaint.id
                            ? "Starting..."
                            : "Start Work"}
                        </button>
                      )}

                      {complaint.status === "in_progress" && (
                        <button
                          type="button"
                          disabled={submittingResolution || submitting}
                          onClick={() => openResolution(complaint)}
                          className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          Submit Resolution
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={submitting || Boolean(pendingEscalation)}
                        onClick={() => openEscalation(complaint)}
                        className="glass-btn-secondary inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pendingEscalation
                          ? "Request pending"
                          : "Request LGU support"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination?.last_page > 1 && !loading && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {pagination.current_page} of {pagination.last_page} ·{" "}
              {pagination.total} complaints
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= pagination.last_page}
                onClick={() => setPage((value) => value + 1)}
                className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Escalation Modal */}
        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) =>
              event.target === event.currentTarget &&
              !submitting &&
              setSelected(null)
            }
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="barangay-escalation-title"
              className="w-full max-w-xl rounded-3xl bg-white shadow-2xl"
            >
              <form onSubmit={submitEscalation}>
                <div className="border-b border-slate-100 p-5">
                  <h3
                    id="barangay-escalation-title"
                    className="text-lg font-semibold text-slate-900"
                  >
                    Request LGU support
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    {selected.title}
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <label className="block text-sm font-medium text-slate-700">
                    Destination department

                    <select
                      required
                      value={destination}
                      onChange={(event) =>
                        setDestination(event.target.value)
                      }
                      className={`${inputClass} mt-1`}
                    >
                      <option value="">Select department</option>

                      {departments.map((department) => (
                        <option
                          key={department.id}
                          value={department.id}
                        >
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Reason for escalation

                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={4}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className={`${inputClass} mt-1 resize-y`}
                      placeholder="Explain why the complaint needs department authority or resources."
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setSelected(null)}
                    className="glass-btn-secondary rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className={primaryBtn}
                  >
                    {submitting ? "Submitting…" : "Submit request"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* Resolution Modal */}
        {selectedResolution && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) =>
              event.target === event.currentTarget &&
              !submittingResolution &&
              setSelectedResolution(null)
            }
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="barangay-resolution-title"
              className="my-auto w-full max-w-xl rounded-3xl bg-white shadow-2xl"
            >
              <form onSubmit={handleResolutionSubmit}>
                <div className="border-b border-slate-100 p-5">
                  <p className="text-xs font-medium text-emerald-700">
                    Barangay Complaint Resolution
                  </p>

                  <h3
                    id="barangay-resolution-title"
                    className="mt-1 text-lg font-semibold text-slate-900"
                  >
                    Submit resolution
                  </h3>

                  <p className="mt-1 text-sm text-slate-600">
                    {selectedResolution.title}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    The resolution will be sent to LGU Staff for review.
                  </p>
                </div>

                <div className="space-y-5 p-5">
                  <label className="block text-sm font-medium text-slate-700">
                    Resolution description

                    <textarea
                      required
                      minLength={10}
                      maxLength={10000}
                      rows={6}
                      value={resolutionDescription}
                      onChange={(event) =>
                        setResolutionDescription(event.target.value)
                      }
                      className={`${inputClass} mt-1 resize-y`}
                      placeholder="Describe the actions taken, how the complaint was addressed, and the final outcome."
                    />

                    <span className="mt-1 block text-xs font-normal text-slate-500">
                      Minimum 10 characters.
                    </span>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Completion date <span className="text-red-600">*</span>
                    <input type="date" required max={new Date().toISOString().slice(0, 10)} value={completedAt} onChange={(event) => setCompletedAt(event.target.value)} className={`${inputClass} mt-1`} />
                  </label>

                  <div>
                    {[
                      { key: "before", label: "Before photo", file: beforePhoto },
                    ].map((photo) => (
                      <label
                        key={photo.key}
                        htmlFor={`resolution-${photo.key}-photo`}
                        className="block text-sm font-medium text-slate-700"
                      >
                        {photo.label} <span className="text-red-600">*</span>
                        <input
                          id={`resolution-${photo.key}-photo`}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          disabled={submittingResolution}
                          onChange={(event) =>
                            handleResolutionPhotoChange(event)
                          }
                          className={`${inputClass} mt-1`}
                        />
                        <span className="mt-1 block truncate text-xs font-normal text-slate-500">
                          {photo.file?.name || "JPG, PNG, or WebP; up to 10 MB"}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label
                      htmlFor="resolution-evidence"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Evidence attachments <span className="text-red-600">*</span>
                    </label>

                    <input
                      id="resolution-evidence"
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleEvidenceChange}
                      className={`${inputClass} mt-1`}
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      At least 1 file is required. Maximum 5 files, JPG, PNG, or PDF, up to 10 MB each.
                    </p>

                    {evidenceFiles.length > 0 && (
                      <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-700">
                          Selected evidence
                        </p>

                        {evidenceFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between gap-3 text-sm text-slate-600"
                          >
                            <span className="truncate">{file.name}</span>

                            <span className="shrink-0 text-xs text-slate-400">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-5">
                  <button
                    type="button"
                    disabled={submittingResolution}
                    onClick={() => setSelectedResolution(null)}
                    className="glass-btn-secondary rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingResolution}
                    className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {submittingResolution
                      ? "Submitting resolution…"
                      : "Submit resolution"}
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
