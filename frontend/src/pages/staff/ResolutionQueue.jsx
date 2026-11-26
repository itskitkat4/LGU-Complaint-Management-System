import { useCallback, useEffect, useState } from "react";
import StaffLayout from "../../layouts/StaffLayout";
import { ContentSkeleton } from "../../components/Skeletons";
import {
  Icon,
  focusRing,
  primaryBtn,
} from "../../components/ui";
import {
  getStaffResolutions,
  reviewResolution,
  getComplaintAttachmentSignedUrl,
} from "../../lib/api";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getFullName(profile) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.email ||
    "Unknown user"
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="glass-soft rounded-xl p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return <ContentSkeleton label="Loading submitted resolutions" variant="list" rows={3} />;
}

export default function ResolutionQueue() {
  const [resolutions, setResolutions] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedResolution, setSelectedResolution] = useState(null);
  const [decision, setDecision] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [attachmentUrls, setAttachmentUrls] = useState({});
  const [attachmentLoading, setAttachmentLoading] = useState({});

  const loadResolutions = useCallback(async (currentPage = 1) => {
    try {
      setLoading(true);
      setError("");

      const result = await getStaffResolutions(currentPage);

      setResolutions(result.data || []);
      setPagination(
        result.pagination || {
          current_page: 1,
          last_page: 1,
          total: 0,
        }
      );
    } catch (err) {
      setError(err.message || "Failed to load pending resolutions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the fetch until after the effect runs; it updates loading and error state.
    void Promise.resolve().then(() => loadResolutions(page));
  }, [page, loadResolutions]);

  function openReview(resolution) {
    setSelectedResolution(resolution);
    setDecision("");
    setReviewComment("");
    setActionError("");
    setActionSuccess("");
    setAttachmentUrls({});
    setAttachmentLoading({});
    resolution.attachments
      ?.filter((attachment) => attachment.evidence_type === "before")
      .forEach((attachment) => void openEvidence(attachment));
  }

  function closeReview() {
    if (actionLoading) return;

    setSelectedResolution(null);
    setDecision("");
    setReviewComment("");
    setActionError("");
    setActionSuccess("");
  }

  async function openEvidence(attachment) {
    if (attachmentUrls[attachment.id]) return;

    try {
      setAttachmentLoading((current) => ({
        ...current,
        [attachment.id]: true,
      }));

      const result = await getComplaintAttachmentSignedUrl(attachment.id);

      if (!result.signed_url) {
        throw new Error("Unable to retrieve the evidence link.");
      }

      setAttachmentUrls((current) => ({
        ...current,
        [attachment.id]: result.signed_url,
      }));
    } catch (err) {
      setActionError(
        err.message || "Failed to retrieve the evidence file."
      );
    } finally {
      setAttachmentLoading((current) => ({
        ...current,
        [attachment.id]: false,
      }));
    }
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!selectedResolution || !decision) {
      setActionError("Please select a review decision.");
      return;
    }

    if (decision === "returned" && !reviewComment.trim()) {
      setActionError("A comment is required when returning a resolution.");
      return;
    }

    if (
      decision === "approved" &&
      !window.confirm(
        "Approve this resolution? The complaint will be marked as resolved."
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      const result = await reviewResolution(
        selectedResolution.id,
        decision,
        reviewComment.trim()
      );

      setActionSuccess(
        result.message || "Resolution reviewed successfully."
      );

      // Refresh the queue after a successful review.
      await loadResolutions(page);

      setSelectedResolution(null);
      setDecision("");
      setReviewComment("");
    } catch (err) {
      setActionError(err.message || "Failed to review resolution.");
    } finally {
      setActionLoading(false);
    }
  }

  const complaint = selectedResolution?.complaint;
  const attachments = selectedResolution?.attachments || [];

  return (
    <StaffLayout title="Resolution Review" role="LGU Staff">
      <div className="space-y-6">

        {/* Page heading */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-16 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                LGU Staff
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                Resolution Review
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review submitted resolutions and decide whether to approve or return them.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadResolutions(page)}
            disabled={loading}
            className={`glass-btn-secondary inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50 ${focusRing}`}
          >
            <Icon name="refresh-cw" className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium text-slate-500">
            Pending resolutions
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {pagination.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Awaiting LGU-Staff review
          </p>
        </div>

        {/* Error */}
        {actionSuccess && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {actionSuccess}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={() => loadResolutions(page)}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Resolution list */}
        {loading ? (
          <LoadingSkeleton />
        ) : !error && resolutions.length === 0 ? (
          <div className="glass rounded-2xl px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Icon name="check" className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No pending resolutions
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Submitted resolutions awaiting review will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {resolutions.map((resolution) => {
              const itemComplaint = resolution.complaint;

              return (
                <article
                  key={resolution.id}
                  className="glass overflow-hidden rounded-2xl"
                >
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-slate-500">
                          Resolution #{resolution.id}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">
                          {itemComplaint?.title || "Complaint details unavailable"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Complaint reference: {resolution.complaint_id}
                        </p>
                      </div>

                      <span className="inline-flex shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        Pending Review
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <InfoItem
                        label="Submitted by"
                        value={getFullName(resolution.submitter)}
                      />
                      <InfoItem
                        label="Category"
                        value={itemComplaint?.category?.name}
                      />
                      <InfoItem
                        label="Barangay"
                        value={itemComplaint?.barangay?.name}
                      />
                      <InfoItem
                        label="Completion date"
                        value={resolution.completed_at?.slice(0, 10)}
                      />
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Submitted
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {formatDate(resolution.submitted_at)}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-500">
                        {resolution.attachments?.length || 0} evidence file(s)
                      </p>

                      <button
                        type="button"
                        onClick={() => openReview(resolution)}
                        className={`${primaryBtn} inline-flex items-center gap-2`}
                      >
                        Review Resolution
                        <Icon name="arrow" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.last_page > 1 && (
          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <p className="text-sm text-slate-500">
              Page {pagination.current_page} of {pagination.last_page}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className={`glass-btn-secondary rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(pagination.last_page, current + 1)
                  )
                }
                disabled={page >= pagination.last_page}
                className={`glass-btn-secondary rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review modal */}
      {selectedResolution && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReview();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Review submitted resolution"
            className="my-auto max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  LGU Staff
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Review Resolution
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Submitted {formatDate(selectedResolution.submitted_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReview}
                disabled={actionLoading}
                aria-label="Close review"
                className={`rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 ${focusRing}`}
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">

              {/* Complaint details */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Original Complaint
                </h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <InfoItem
                    label="Complaint Title"
                    value={complaint?.title}
                  />
                  <InfoItem
                    label="Citizen"
                    value={getFullName(complaint?.citizen)}
                  />
                  <InfoItem
                    label="Category"
                    value={complaint?.category?.name}
                  />
                  <InfoItem
                    label="Barangay"
                    value={complaint?.barangay?.name}
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Citizen's description
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {complaint?.description || "No description available."}
                  </p>
                </div>
              </section>

              {/* Resolution details */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Submitted Resolution
                </h3>

                <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Resolution Description
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {selectedResolution.resolution_description}
                  </p>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <InfoItem
                    label="Submitted by"
                    value={getFullName(selectedResolution.submitter)}
                  />
                  <InfoItem
                    label="Submitted at"
                    value={formatDate(selectedResolution.submitted_at)}
                  />
                  <InfoItem
                    label="Completion date"
                    value={selectedResolution.completed_at?.slice(0, 10)}
                  />
                </div>
                {complaint?.resolutions?.filter((item) => item.id !== selectedResolution.id).length > 0 && (
                  <div className="mt-4 rounded-xl border border-slate-200 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Previous review history
                    </h4>
                    <ul className="mt-2 space-y-2">
                      {complaint.resolutions
                        .filter((item) => item.id !== selectedResolution.id)
                        .map((item) => (
                          <li key={item.id} className="text-sm text-slate-700">
                            <strong className="capitalize">{item.review_status.replaceAll("_", " ")}</strong>
                            {item.reviewed_at ? ` on ${formatDate(item.reviewed_at)}` : ""}
                            {item.reviewer ? ` by ${getFullName(item.reviewer)}` : ""}
                            {item.review_comment ? ` — ${item.review_comment}` : ""}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* Evidence */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Resolution Evidence
                </h3>

                {attachments.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No evidence files were submitted.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Icon name="file" className="h-5 w-5" />
                          </span>

                          <div className="min-w-0">
                            <p className="break-all text-sm font-medium text-slate-800">
                              {attachment.evidence_type === "before" ? "Before photo" : "Supporting evidence"}: {attachment.file_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {attachment.mime_type || "Evidence file"}
                            </p>
                            {attachmentUrls[attachment.id] && attachment.mime_type?.startsWith("image/") && (
                              <img
                                src={attachmentUrls[attachment.id]}
                                alt={`${attachment.evidence_type} resolution photo`}
                                className="mt-3 max-h-64 w-full rounded-xl border border-slate-200 object-contain"
                              />
                            )}
                          </div>
                        </div>

                        {attachmentUrls[attachment.id] ? (
                          <a
                            href={attachmentUrls[attachment.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
                          >
                            Open file
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEvidence(attachment)}
                            disabled={attachmentLoading[attachment.id]}
                            className={`glass-btn-secondary rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 ${focusRing}`}
                          >
                            {attachmentLoading[attachment.id]
                              ? "Loading..."
                              : "Get secure link"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Decision form */}
              <form onSubmit={submitReview} className="space-y-5 border-t border-slate-200 pt-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Review Decision
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Approving resolves the complaint. Returning keeps it in progress for further action.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setDecision("approved");
                      setActionError("");
                    }}
                    className={`rounded-2xl border p-4 text-left transition-colors disabled:opacity-50 ${
                      decision === "approved"
                        ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-emerald-800">
                      Approve Resolution
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Mark the complaint as resolved and end its active assignment.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => {
                      setDecision("returned");
                      setActionError("");
                    }}
                    className={`rounded-2xl border p-4 text-left transition-colors disabled:opacity-50 ${
                      decision === "returned"
                        ? "border-red-500 bg-red-50 ring-2 ring-red-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-red-700">
                      Return Resolution
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Request further action while keeping the complaint in progress.
                    </p>
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="review-comment"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Review Comment
                    {decision === "returned" && (
                      <span className="ml-1 text-red-600">*</span>
                    )}
                    {decision !== "returned" && (
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        (optional)
                      </span>
                    )}
                  </label>

                  <textarea
                    id="review-comment"
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    required={decision === "returned"}
                    disabled={actionLoading}
                    placeholder={
                      decision === "returned"
                        ? "Explain what needs to be corrected or completed..."
                        : "Add an optional review comment..."
                    }
                    className="glass-input mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {reviewComment.length}/2000
                  </p>
                </div>

                {actionError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {actionError}
                  </div>
                )}

                <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeReview}
                    disabled={actionLoading}
                    className={`glass-btn-secondary rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50 ${focusRing}`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      actionLoading ||
                      !decision ||
                      (decision === "returned" && !reviewComment.trim())
                    }
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      decision === "returned"
                        ? "bg-red-600 hover:bg-red-700"
                        : "glass-btn-primary"
                    } ${focusRing}`}
                  >
                    {actionLoading
                      ? "Submitting..."
                      : decision === "approved"
                        ? "Confirm Approval"
                        : decision === "returned"
                          ? "Return Resolution"
                          : "Select a Decision"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}
    </StaffLayout>
  );
}
