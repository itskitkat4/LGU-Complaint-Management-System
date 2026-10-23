import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import {
  Icon,
  PriorityBadge,
  StatusBadge,
  focusRing,
  inputClass,
  primaryBtn,
} from "../../components/ui";

export default function ComplaintWorkDetails() {
  const { id } = useParams();
  const [actionTaken, setActionTaken] = useState("");
  const [resolution, setResolution] = useState("");
  const [evidence, setEvidence] = useState(null);

  function submit(event) {
    event.preventDefault();
    alert("Demo only. Resolution, evidence upload, and API submission are not connected.");
  }

  return (
    <StaffLayout title="Complaint Work Details" role="Department Personnel">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          to="/personnel/assignments"
          className={`inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
        >
          <Icon name="back" className="h-4 w-4" />
          My assignments
        </Link>

        {/* Complaint summary */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500">
              Reference: {id || "BS-DEMO-031"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Repair damaged streetlight
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <PriorityBadge priority="High" />
              <StatusBadge status="In Progress" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Sample assignment details. Live complaint information will be loaded from the
              backend later.
            </p>
          </div>
        </section>

        {/* Work update form */}
        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">
              Work update and resolution
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Document what was done and how the complaint was resolved.
            </p>
          </div>

          <div className="space-y-6 p-6">
            <div>
              <label htmlFor="action-taken" className="mb-1.5 block text-sm font-medium text-slate-700">
                Action taken
              </label>
              <textarea
                id="action-taken"
                required
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={3}
                placeholder="Describe the inspection, repair, or other actions performed..."
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <label htmlFor="resolution" className="mb-1.5 block text-sm font-medium text-slate-700">
                Resolution summary
              </label>
              <textarea
                id="resolution"
                required
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                placeholder="Describe the outcome and remaining issues..."
                className={`${inputClass} resize-y`}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Supporting evidence <span className="font-normal text-slate-500">(optional)</span>
              </span>
              <label
                htmlFor="evidence"
                className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center transition-colors hover:border-emerald-700 hover:bg-emerald-50/50 focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                  <Icon name="upload" className="h-6 w-6" />
                </span>
                <span className="mt-4 text-sm font-semibold text-slate-900">
                  Choose an evidence photo
                </span>
                <span className="mt-1 text-sm text-slate-500">
                  Select an image from your device
                </span>
                <input
                  id="evidence"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setEvidence(e.target.files?.[0] || null)}
                />
              </label>

              {evidence && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                  <Icon name="check" className="h-4 w-4" />
                  Selected: {evidence.name}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                The file is selected locally only; upload to Supabase Storage is not connected
                here.
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 px-6 py-5">
            <button type="submit" className={primaryBtn}>
              Submit resolution (demo)
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </StaffLayout>
  );
}