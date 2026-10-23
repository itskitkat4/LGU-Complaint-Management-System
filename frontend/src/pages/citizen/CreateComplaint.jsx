import { useState } from "react";
import { Link } from "react-router-dom";
import CitizenLayout from "../../layouts/CitizenLayout";
import { Icon, focusRing, inputClass, primaryBtn, secondaryBtn } from "../../components/ui";

const categories = [
  { value: "Infrastructure", label: "Roads and Infrastructure" },
  { value: "Sanitation", label: "Garbage and Sanitation" },
  { value: "Water", label: "Water Supply" },
  { value: "Public Safety", label: "Public Safety" },
  { value: "Public Service", label: "Public Service" },
  { value: "Other", label: "Other" },
];

function Field({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function CreateComplaint() {
  const [form, setForm] = useState({
    title: "",
    category: "",
    barangay: "",
    location: "",
    description: "",
  });
  const [evidence, setEvidence] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    // UI demonstration only: API and AI are not connected yet.
    alert(
      "Initial complaint details saved in this form. AI generation and API submission are not connected yet."
    );
  }

  return (
    <CitizenLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Heading */}
        <div>
          <Link
            to="/citizen/dashboard"
            className={`inline-flex items-center gap-1.5 rounded text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
          >
            <Icon name="back" className="h-4 w-4" />
            Back to dashboard
          </Link>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Submit a complaint
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Describe your concern. BantaySerbisyo will help you prepare a structured
            complaint for review.
          </p>
        </div>

        {/* AI assistant notice */}
        <div className="flex items-start gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white">
            <Icon name="sparkle" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-emerald-950">AI Complaint Assistant</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900/80">
              Enter your initial information first. The planned AI feature will help
              organize your details into a complete complaint draft that you can review
              and edit before submission.
            </p>
            <span className="mt-3 inline-block rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
              AI integration coming next
            </span>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">Complaint details</h2>
            <p className="mt-1 text-sm text-slate-500">
              Fields are required unless marked optional.
            </p>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="title" label="Complaint title">
                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  placeholder="e.g. Uncollected garbage"
                  className={inputClass}
                />
              </Field>

              <Field id="category" label="Complaint category">
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="barangay" label="Barangay">
                <input
                  id="barangay"
                  name="barangay"
                  value={form.barangay}
                  onChange={handleChange}
                  required
                  placeholder="Enter your barangay"
                  className={inputClass}
                />
              </Field>

              <Field id="location" label="Specific location">
                <input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  required
                  placeholder="Street, landmark, or nearby place"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="description" label="Initial complaint details">
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={6}
                maxLength={5000}
                placeholder="What happened? Where and when did it happen? Provide the details you know."
                className={`${inputClass} resize-y`}
              />
              <p className="mt-1.5 text-right text-xs text-slate-500">
                {form.description.length}/5000 characters
              </p>
            </Field>

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
                  onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
                />
              </label>

              {evidence && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                  <Icon name="check" className="h-4 w-4" />
                  Selected: {evidence.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
            <Link to="/citizen/dashboard" className={secondaryBtn}>
              Cancel
            </Link>
            <button type="submit" className={primaryBtn}>
              Prepare complaint
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </CitizenLayout>
  );
}