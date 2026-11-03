import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, StatusBadge, focusRing, inputClass, primaryBtn } from "../../components/ui";

export default function ComplaintReview() {
  const { id } = useParams();
  const [decision, setDecision] = useState("Barangay-level");
  const [notes, setNotes] = useState("");

  function submit(event) {
    event.preventDefault();
    alert(`Demo only: ${decision} selected for ${id || "sample complaint"}. Not saved.`);
  }

  return (
    <StaffLayout title="Complaint Review" role="LGU Staff">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          to="/staff/complaints"
          className={`inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
        >
          <Icon name="back" className="h-4 w-4" />
          Back to queue
        </Link>

        {/* Complaint summary */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Reference: {id || "BS-DEMO-001"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Uncollected garbage
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Category: Sanitation · Location: Sample location
              </p>
            </div>
            <StatusBadge status="Pending Review" />
          </div>

          <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Citizen's description</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Example complaint description. Actual citizen details will appear when connected
              to the API.
            </p>
          </div>
        </section>

        {/* Decision form */}
        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">Review decision</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose how this complaint should be handled.
            </p>
          </div>

          <div className="space-y-6 p-6">
            <div>
              <label htmlFor="decision" className="mb-1.5 block text-sm font-medium text-slate-700">
                Handling level
              </label>
              <select
                id="decision"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className={inputClass}
              >
                <option>Barangay-level</option>
                <option>LGU-level</option>
                <option>Request More Information</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-slate-700">
                Review notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                required
                placeholder="Explain the decision or additional information needed..."
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 px-6 py-5">
            <button type="submit" className={primaryBtn}>
              Save review (demo)
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </StaffLayout>
  );
}