import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import CitizenLayout from "../../layouts/CitizenLayout";
import { Icon, focusRing, inputClass, primaryBtn } from "../../components/ui";
import PercentageBar from "../../components/PercentageBar";
import {
  getEligibleFeedbackComplaints,
  getMyFeedback,
  submitCitizenFeedback,
} from "../../lib/api";

const ratingLabels = {
  1: "Very poor",
  2: "Poor",
  3: "Fair",
  4: "Good",
  5: "Excellent",
};

export default function Feedback() {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0); // UI only: star hover preview
  const [message, setMessage] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [feedbackPage, setFeedbackPage] = useState({ current_page: 1, last_page: 1 });
  const [complaintId, setComplaintId] = useState("");
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadEligibleComplaints() {
      try {
        const data = await getEligibleFeedbackComplaints();
        setComplaints(data);
      } catch (error) {
        void Swal.fire({
          title: "Unable to load complaints",
          text: error.message,
          icon: "error",
          confirmButtonColor: "#047857",
        });
      } finally {
        setLoadingComplaints(false);
      }
    }

    void loadEligibleComplaints();
    getMyFeedback()
      .then((result) => {
        setMyFeedback(result.data || []);
        setFeedbackPage(result.pagination || { current_page: 1, last_page: 1 });
      })
      .catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();

    if (!complaintId) {
      void Swal.fire({
        title: "Select a complaint",
        text: "Please select a resolved complaint before submitting feedback.",
        icon: "warning",
        confirmButtonColor: "#047857",
      });
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitCitizenFeedback(
        complaintId,
        rating,
        message.trim()
      );

      await Swal.fire({
        title: "Feedback submitted!",
        text: "Thank you for helping improve local government services.",
        icon: "success",
        confirmButtonColor: "#047857",
      });

      setComplaints((current) =>
        current.filter((complaint) => complaint.id !== complaintId)
      );
      setMyFeedback((current) => [{
        ...result.feedback,
        complaint: { title: selectedComplaint?.title || "Complaint feedback" },
      }, ...current]);
      setFeedbackPage((current) => ({ ...current, total: (current.total || 0) + 1 }));

      setComplaintId("");
      setRating(5);
      setMessage("");
    } catch (error) {
      void Swal.fire({
        title: "Submission failed",
        text: error.message,
        icon: "error",
        confirmButtonColor: "#047857",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const noEligible = !loadingComplaints && complaints.length === 0;
  const selectedComplaint = complaints.find(
    (complaint) => String(complaint.id) === String(complaintId)
  );
  const charRatio = message.length / 2000;

  return (
    <CitizenLayout>
      <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <Link
            to="/citizen/dashboard"
            className={`inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
          >
            <Icon name="back" className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="mt-4 flex items-start gap-3">
            <span className="mt-1 h-14 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Citizen feedback
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Tell us how your resolved complaint was handled. Your answers go
                straight to the municipality so they can improve their services.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="glass overflow-hidden rounded-2xl"
        >
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-500" />

          {/* Empty-state banner */}
          {noEligible && (
            <div
              role="status"
              className="flex items-start gap-3 border-b border-amber-100 bg-amber-50 px-6 py-4"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Nothing to review yet
                </p>
                <p className="mt-0.5 text-sm text-amber-800">
                  Feedback opens once one of your complaints is marked
                  resolved. Check back after it is closed.
                </p>
              </div>
            </div>
          )}

          <div
            className={`space-y-8 p-6 sm:p-8 ${
              noEligible ? "opacity-60" : ""
            }`}
          >
            {/* Complaint */}
            <div>
              <label
                htmlFor="complaint"
                className="mb-1.5 block text-sm font-semibold text-slate-900"
              >
                Which complaint is this about?
              </label>
              <p className="mb-3 text-sm text-slate-500">
                Only resolved complaints without feedback are listed.
              </p>

              <div className="relative">
                <select
                  id="complaint"
                  value={complaintId}
                  onChange={(event) => setComplaintId(event.target.value)}
                  required
                  disabled={loadingComplaints || complaints.length === 0}
                  className={`${inputClass} w-full appearance-none pr-10 disabled:cursor-not-allowed disabled:bg-slate-50`}
                >
                  <option value="">
                    {loadingComplaints
                      ? "Loading complaints..."
                      : complaints.length === 0
                        ? "No eligible resolved complaints"
                        : "Choose a complaint"}
                  </option>

                  {complaints.map((complaint) => (
                    <option key={complaint.id} value={complaint.id}>
                      {complaint.title}
                      {complaint.category?.name
                        ? ` — ${complaint.category.name}`
                        : ""}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              {loadingComplaints && (
                <div
                  className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-100"
                  aria-hidden="true"
                />
              )}

              {selectedComplaint && (
                <div className="glass-soft mt-3 flex items-center gap-3 rounded-xl px-4 py-3">
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-emerald-700"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {selectedComplaint.title}
                    </p>
                    {selectedComplaint.category?.name && (
                      <p className="text-xs text-slate-600">
                        {selectedComplaint.category.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Rating */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900">
                How would you rate the service?
              </legend>
              <p className="mt-1 text-sm text-slate-500">
                1 is very poor, 5 is excellent.
              </p>

              <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
                <div
                  className="flex items-center gap-1"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((value) => {
                    const filled = value <= (hoverRating || rating);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        onMouseEnter={() => setHoverRating(value)}
                        onFocus={() => setHoverRating(value)}
                        onBlur={() => setHoverRating(0)}
                        aria-pressed={rating === value}
                        aria-label={`${value} out of 5 – ${ratingLabels[value]}`}
                        className={`rounded-xl p-1.5 transition-transform hover:scale-110 ${focusRing}`}
                      >
                        <Icon
                          name="star"
                          className={`h-9 w-9 sm:h-10 sm:w-10 transition-colors ${
                            filled
                              ? "fill-current text-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <p
                  className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800"
                  aria-live="polite"
                >
                  {rating} out of 5
                  <span className="font-normal text-amber-700">
                    · {ratingLabels[rating]}
                  </span>
                </p>
              </div>
            </fieldset>

            <hr className="border-slate-100" />

            {/* Comments */}
            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-semibold text-slate-900"
              >
                Your comments
              </label>
              <p className="mb-3 text-sm text-slate-500">
                What went well, and what could be better?
              </p>

              <textarea
                id="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                required
                maxLength={2000}
                placeholder="Share your experience or suggestions..."
                className={`${inputClass} w-full resize-y leading-6`}
              />

              <div className="mt-2 flex items-center gap-3">
                <div
                  className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100"
                  aria-hidden="true"
                >
                  <PercentageBar
                    percentage={Math.min(charRatio * 100, 100)}
                    fillClassName={`${
                      charRatio > 0.9 ? "text-amber-500" : "text-emerald-600"
                    } transition-all`}
                  />
                </div>
                <p className="text-xs tabular-nums text-slate-500">
                  {message.length}/2000
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-xs leading-5 text-slate-500">
              Your feedback is shared with the municipality to improve
              services.
            </p>
            <button
              type="submit"
              disabled={submitting || loadingComplaints || complaints.length === 0}
              className={`${primaryBtn} w-full shrink-0 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {submitting ? "Submitting..." : "Submit feedback"}
              {!submitting && <Icon name="arrow" className="h-4 w-4" />}
            </button>
          </div>
        </form>

        <section className="glass rounded-2xl p-6 sm:p-8" aria-labelledby="my-feedback-title">
          <h2 id="my-feedback-title" className="text-lg font-semibold text-slate-900">My submitted feedback</h2>
          <p className="mt-1 text-sm text-slate-500">Only your own ratings and comments are shown here.</p>
          {myFeedback.length ? (
            <ul className="mt-5 divide-y divide-slate-100">
              {myFeedback.map((item) => (
                <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.complaint?.title || "Complaint feedback"}</p>
                    <span className="text-sm font-semibold text-amber-700">{item.rating}/5 ★</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.comment}</p>
                  <p className="mt-2 text-xs text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" }) : "Just submitted"}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-5 text-sm text-slate-500">You have not submitted feedback yet.</p>}
          {feedbackPage.last_page > 1 && (
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">Page {feedbackPage.current_page} of {feedbackPage.last_page}</span>
              <div className="flex gap-2">
                <button type="button" disabled={feedbackPage.current_page <= 1} onClick={() => getMyFeedback(feedbackPage.current_page - 1).then((result) => { setMyFeedback(result.data || []); setFeedbackPage(result.pagination); })} className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Previous</button>
                <button type="button" disabled={feedbackPage.current_page >= feedbackPage.last_page} onClick={() => getMyFeedback(feedbackPage.current_page + 1).then((result) => { setMyFeedback(result.data || []); setFeedbackPage(result.pagination); })} className="glass-btn-secondary rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </CitizenLayout>
  );
}
