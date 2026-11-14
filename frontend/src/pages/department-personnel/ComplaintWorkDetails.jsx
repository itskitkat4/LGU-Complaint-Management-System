
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import StaffLayout from "../../layouts/StaffLayout";
import {
  Icon,
  PriorityBadge,
  StatusBadge,
  inputClass,
  primaryBtn,
} from "../../components/ui";
import {
  getDepartmentPersonnelComplaint,
  startDepartmentPersonnelWork,
  submitComplaintResolution,
  getComplaintAttachmentSignedUrl,
} from "../../lib/api";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

export default function ComplaintWorkDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [actionTaken, setActionTaken] = useState("");
  const [resolution, setResolution] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load the complaint assigned to the current personnel.
  useEffect(() => {
    let isMounted = true;

    async function loadComplaint() {
      try {
        setLoading(true);
        setError("");

        const result = await getDepartmentPersonnelComplaint(id);

        if (isMounted) {
          setComplaint(result.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load complaint details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadComplaint();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Start working on an assigned complaint.
  async function startWork() {
    if (!complaint || complaint.status !== "assigned") {
      return;
    }

    const confirmation = await Swal.fire({
      title: "Start working on this complaint?",
      text: "The complaint status will change to In Progress.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Start Work",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#047857",
    });

    if (!confirmation.isConfirmed) return;

    try {
      setStarting(true);

      const result = await startDepartmentPersonnelWork(complaint.id);

      // Update the displayed complaint with the backend response.
      setComplaint(result.data);

      await Swal.fire({
        title: "Work started",
        text: "The complaint is now marked as In Progress. You can submit your work update and resolution.",
        icon: "success",
        confirmButtonColor: "#047857",
      });
    } catch (err) {
      void Swal.fire({
        title: "Unable to start work",
        text: err.message || "Please try again.",
        icon: "error",
        confirmButtonColor: "#047857",
      });
    } finally {
      setStarting(false);
    }
  }

  // Validate and add selected evidence files.
  function handleEvidenceChange(event) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length + evidence.length > MAX_FILES) {
      void Swal.fire({
        title: "Too many files",
        text: `You can upload a maximum of ${MAX_FILES} evidence files.`,
        icon: "warning",
        confirmButtonColor: "#047857",
      });

      event.target.value = "";
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) =>
        !ALLOWED_TYPES.includes(file.type) ||
        file.size > MAX_FILE_SIZE
    );

    if (invalidFile) {
      void Swal.fire({
        title: "Invalid file",
        text: "Only JPG, PNG, and PDF files up to 10 MB each are allowed.",
        icon: "warning",
        confirmButtonColor: "#047857",
      });

      event.target.value = "";
      return;
    }

    setEvidence((current) => [...current, ...selectedFiles]);

    event.target.value = "";
  }

  // Remove a selected evidence file.
  function removeEvidence(index) {
    setEvidence((current) =>
      current.filter((_, fileIndex) => fileIndex !== index)
    );
  }

  // Open an existing complaint attachment using a signed URL.
  async function openAttachment(attachmentId) {
    const newWindow = window.open("", "_blank");

    try {
      const result = await getComplaintAttachmentSignedUrl(attachmentId);

      if (!result.signed_url) {
        throw new Error("Attachment URL is unavailable.");
      }

      if (!newWindow) {
        throw new Error(
          "Your browser blocked the attachment tab. Allow popups and try again."
        );
      }

      newWindow.location.href = result.signed_url;
    } catch (err) {
      newWindow?.close();

      void Swal.fire({
        title: "Unable to open attachment",
        text: err.message || "Please try again.",
        icon: "error",
        confirmButtonColor: "#047857",
      });
    }
  }

  // Submit work details and supporting evidence.
  async function submit(event) {
    event.preventDefault();

    if (!complaint) return;

    if (complaint.status !== "in_progress") {
      void Swal.fire({
        title: "Submission unavailable",
        text: "Only complaints currently in progress can receive a resolution submission.",
        icon: "warning",
        confirmButtonColor: "#047857",
      });

      return;
    }

    if (
      actionTaken.trim().length < 5 ||
      resolution.trim().length < 5
    ) {
      void Swal.fire({
        title: "Incomplete information",
        text: "Please provide at least 5 characters for both Action Taken and Resolution Summary.",
        icon: "warning",
        confirmButtonColor: "#047857",
      });

      return;
    }

    const description = [
      "Action taken:",
      actionTaken.trim(),
      "",
      "Resolution summary:",
      resolution.trim(),
    ].join("\n");

    try {
      setSubmitting(true);

      await submitComplaintResolution(
        complaint.id,
        description,
        evidence
      );

      await Swal.fire({
        title: "Resolution submitted",
        text: "Your resolution and supporting evidence have been submitted for LGU-Staff review.",
        icon: "success",
        confirmButtonColor: "#047857",
      });

      navigate("/personnel/assignments");
    } catch (err) {
      void Swal.fire({
        title: "Submission failed",
        text: err.message || "Unable to submit the resolution. Please try again.",
        icon: "error",
        confirmButtonColor: "#047857",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state.
  if (loading) {
    return (
      <StaffLayout
        title="Complaint Work Details"
        role="Department Personnel"
      >
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="h-48 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </StaffLayout>
    );
  }

  // Error or missing complaint state.
  if (error || !complaint) {
    return (
      <StaffLayout
        title="Complaint Work Details"
        role="Department Personnel"
      >
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            to="/personnel/assignments"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline"
          >
            <Icon name="back" className="h-4 w-4" />
            My assignments
          </Link>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-medium text-red-700">
              {error || "Complaint not found."}
            </p>

            <p className="mt-2 text-sm text-red-600">
              The complaint may no longer be assigned to your account.
            </p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  const canStart = complaint.status === "assigned";
  const canSubmit = complaint.status === "in_progress";

  return (
    <StaffLayout
      title="Complaint Work Details"
      role="Department Personnel"
    >
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Back navigation */}
        <Link
          to="/personnel/assignments"
          className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline"
        >
          <Icon name="back" className="h-4 w-4" />
          My assignments
        </Link>

        {/* Complaint details */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500">
              Complaint ID: {complaint.id}
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {complaint.title}
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
            </div>

            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Complaint category
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {complaint.category?.name || "Uncategorized"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Barangay
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {complaint.barangay?.name || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Submitted by
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {complaint.citizen?.full_name || "Citizen"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Resolution level
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {complaint.resolution_level || "Not specified"}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-xs font-medium text-slate-500">
                Complaint description
              </p>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                {complaint.description}
              </p>
            </div>
          </div>
        </section>

        {/* Start work action */}
        {canStart && (
          <section className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-blue-900">
                Ready to start working?
              </h2>

              <p className="mt-1 text-sm text-blue-800">
                Start the assigned complaint when you begin working on it.
              </p>
            </div>

            <button
              type="button"
              onClick={startWork}
              disabled={starting}
              className={`${primaryBtn} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {starting ? "Starting..." : "Start Work"}

              {!starting && (
                <Icon name="arrow" className="h-4 w-4" />
              )}
            </button>
          </section>
        )}

        {/* Original complaint evidence */}
        {complaint.attachments?.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Original complaint evidence
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Files originally submitted by the citizen.
            </p>

            <ul className="mt-4 space-y-2">
              {complaint.attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <span className="break-all text-sm text-slate-700">
                    {attachment.file_name ||
                      attachment.original_name ||
                      "Complaint attachment"}
                  </span>

                  <button
                    type="button"
                    onClick={() => openAttachment(attachment.id)}
                    className="shrink-0 text-sm font-semibold text-emerald-800 hover:underline"
                  >
                    View file
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Resolution submission form */}
        <form
          onSubmit={submit}
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">
              Work update and resolution
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Document the actions performed and the outcome of your work.
            </p>
          </div>

          <div className="space-y-6 p-6">

            {/* Submission availability */}
            {!canSubmit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {canStart
                  ? "Start working on this complaint before submitting a resolution."
                  : "Resolution submission is available only when the complaint is in progress."}
              </div>
            )}

            {/* Action taken */}
            <div>
              <label
                htmlFor="action-taken"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Action taken
              </label>

              <textarea
                id="action-taken"
                required
                minLength={5}
                value={actionTaken}
                onChange={(event) => setActionTaken(event.target.value)}
                rows={3}
                disabled={!canSubmit || submitting}
                placeholder="Describe the inspection, repair, or other actions performed..."
                className={`${inputClass} resize-y`}
              />
            </div>

            {/* Resolution summary */}
            <div>
              <label
                htmlFor="resolution"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Resolution summary
              </label>

              <textarea
                id="resolution"
                required
                minLength={5}
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                rows={3}
                disabled={!canSubmit || submitting}
                placeholder="Describe the outcome and any remaining issues..."
                className={`${inputClass} resize-y`}
              />
            </div>

            {/* Supporting evidence */}
            <div>
              <label
                htmlFor="evidence"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Supporting evidence{" "}
                <span className="font-normal text-slate-500">
                  (optional)
                </span>
              </label>

              <label
                htmlFor="evidence"
                className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center transition-colors hover:border-emerald-700 hover:bg-emerald-50/50 focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                  <Icon name="upload" className="h-6 w-6" />
                </span>

                <span className="mt-4 text-sm font-semibold text-slate-900">
                  Choose evidence files
                </span>

                <span className="mt-1 text-sm text-slate-500">
                  JPG, PNG, or PDF · Maximum 5 files · 10 MB each
                </span>

                <input
                  id="evidence"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  disabled={
                    !canSubmit ||
                    submitting ||
                    evidence.length >= MAX_FILES
                  }
                  className="sr-only"
                  onChange={handleEvidenceChange}
                />
              </label>

              {/* Selected evidence list */}
              {evidence.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {evidence.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon
                          name="file"
                          className="h-4 w-4 shrink-0 text-slate-500"
                        />

                        <span className="break-all text-sm text-slate-700">
                          {file.name}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => removeEvidence(index)}
                        className="shrink-0 text-sm font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end border-t border-slate-100 px-6 py-5">
            <button
              type="submit"
              disabled={!canSubmit || submitting || starting}
              className={`${primaryBtn} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {submitting ? "Submitting..." : "Submit resolution"}

              {!submitting && (
                <Icon name="arrow" className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </StaffLayout>
  );
}
