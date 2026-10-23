import { useState } from "react";
import { Link } from "react-router-dom";
import CitizenLayout from "../../layouts/CitizenLayout";
import { Icon, focusRing, inputClass, primaryBtn } from "../../components/ui";

const ratingLabels = {
  1: "Very poor",
  2: "Poor",
  3: "Fair",
  4: "Good",
  5: "Excellent",
};

export default function Feedback() {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    alert("Feedback UI demo only. The feedback API is not connected yet.");
  }

  return (
    <CitizenLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link
            to="/citizen/dashboard"
            className={`inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
          >
            <Icon name="back" className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Citizen feedback
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Help improve local government services by sharing your experience.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">Share your experience</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your feedback helps the municipality improve its services.
            </p>
          </div>

          <div className="space-y-6 p-6">
            <fieldset>
              <legend className="text-sm font-medium text-slate-700">
                How would you rate the service?
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const selected = rating === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      aria-pressed={selected}
                      aria-label={`${value} out of 5 – ${ratingLabels[value]}`}
                      className={`inline-flex min-h-11 min-w-14 items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${focusRing} ${
                        selected
                          ? "border-emerald-800 bg-emerald-800 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {value}
                      <Icon
                        name="star"
                        className={`h-4 w-4 ${selected ? "fill-current" : ""}`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500" aria-live="polite">
                Selected rating: {rating} out of 5 · {ratingLabels[rating]}
              </p>
            </fieldset>

            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Your comments
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
                maxLength={2000}
                placeholder="Share your experience or suggestions..."
                className={`${inputClass} resize-y`}
              />
              <p className="mt-1.5 text-right text-xs text-slate-500">
                {message.length}/2000 characters
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 px-6 py-5">
            <button type="submit" className={`${primaryBtn} w-full sm:w-auto`}>
              Submit feedback
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </CitizenLayout>
  );
}