import { Link } from "react-router-dom";
import { focusRing, inputClass, primaryBtn, secondaryBtn } from "../../components/ui";

const compactInput = `${inputClass} !h-10 !py-2 !text-sm`;

// -----------------------------------------------------------------------------
// Icons
// -----------------------------------------------------------------------------

const ICONS = {
  back: (
    <>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </>
  ),

  bot: (
    <>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
    </>
  ),

  arrowUp: <path d="m5 12 7-7 7 7M12 19V5" />,

  pin: (
    <>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),

  tag: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </>
  ),

  file: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
    </>
  ),

  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),

  check: <path d="M20 6 9 17l-5-5" />,

  x: <path d="M18 6 6 18M6 6l12 12" />,

  clipboard: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </>
  ),

  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3M12 17h.01" />
    </>
  ),

  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),

  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),

  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),

  building: (
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18zM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4" />
  ),

  type: <path d="M4 7V4h16v3M9 20h6M12 4v16" />,

  image: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),

  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),

  refresh: (
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5" />
  ),

  expand: <path d="M15 3h6v6M21 3l-7 7M3 21l7-7M9 21H3v-6" />,

  shrink: <path d="m14 10 7-7M20 10h-6V4M3 21l7-7M4 14h6v6" />,

  wand: <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72M14 7l3 3M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9" />,
};

export function Glyph({ name, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Reusable components
// -----------------------------------------------------------------------------

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

export function Field({ id, label, icon, optional, right, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
        >
          {icon && (
            <Glyph name={icon} className="h-4 w-4 text-emerald-700" />
          )}

          {label}

          {optional && (
            <span className="font-normal text-slate-500">(optional)</span>
          )}
        </label>

        {right}
      </div>

      {children}
    </div>
  );
}

export function ErrorBanner({ children }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      <Glyph name="alert" className="mt-0.5 h-4 w-4" />
      <span>{children}</span>
    </div>
  );
}

export function IconInput({ icon, children }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-slate-400">
        <Glyph name={icon} className="h-4 w-4" />
      </span>

      {children}
    </div>
  );
}

export function PanelIconButton({ label, onClick, className = "", children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={`h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none ${
            delay ? `typing-dot-delay-${delay}` : ""
          }`}
        />
      ))}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Evidence upload
// -----------------------------------------------------------------------------

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidencePicker({ id, file, previewUrl, onChange }) {
  if (file && previewUrl) {
    return (
      <div className="glass-soft flex items-center gap-3 rounded-xl p-2">
        <img
          src={previewUrl}
          alt="Selected evidence preview"
          className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">
            {file.name}
          </p>

          <p className="flex items-center gap-1 text-xs text-emerald-800">
            <Glyph name="check" className="h-3.5 w-3.5" />
            Attached, {formatSize(file.size)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove photo"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600 ${focusRing}`}
        >
          <Glyph name="x" className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      className="glass-input flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 transition-colors hover:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-800 ring-1 ring-slate-200">
        <Glyph name="camera" className="h-[18px] w-[18px]" />
      </span>

      <span>
        <span className="block text-sm font-medium text-slate-900">
          Choose an evidence photo
        </span>

        <span className="block text-xs text-slate-500">
          JPG, PNG, or WEBP, up to 5 MB
        </span>
      </span>

      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </label>
  );
}


export function ComplaintDetailsForm({
  form, onChange, loadingFormData, categories, barangays, error,
  descriptionLength, evidence, evidencePreviewUrl, onEvidenceChange,
  onAnonymousChange, submitting, onSubmit,
}) {
  return (
    <>
          {/* Complaint form */}
          <form
            onSubmit={(event) => {
              void onSubmit(event);
            }}
            className="glass overflow-hidden rounded-2xl"
          >
            <div className="glass-soft flex items-center gap-2.5 px-4 py-2.5">
              <Glyph
                name="clipboard"
                className="h-4 w-4 text-emerald-800"
              />

              <h2 className="text-sm font-semibold text-emerald-900">
                Complaint details
              </h2>

              <span className="ml-auto text-xs text-emerald-900/70">
                Required unless marked optional
              </span>
            </div>

            <div className="space-y-3 p-4">
              {error && <ErrorBanner>{error}</ErrorBanner>}

              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <Field id="title" label="Complaint title">
                  <IconInput icon="type">
                    <input
                      id="title"
                      name="title"
                      value={form.title}
                      onChange={onChange}
                      required
                      maxLength={255}
                      placeholder="e.g. Uncollected garbage"
                      className={`${compactInput} !pl-10`}
                    />
                  </IconInput>
                </Field>

                <Field id="category_id" label="Complaint category">
                  {loadingFormData ? (
                    <output aria-live="polite" className="block">
                      <span className="sr-only">Loading categories...</span>
                      <Skeleton className="h-10 w-full" />
                    </output>
                  ) : (
                    <IconInput icon="tag">
                      <select
                        id="category_id"
                        name="category_id"
                        value={form.category_id}
                        onChange={onChange}
                        required
                        className={`${compactInput} !pl-10`}
                      >
                        <option value="">Select a category</option>

                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </IconInput>
                  )}
                </Field>

                <Field id="barangay_id" label="Incident barangay">
                  {loadingFormData ? (
                    <output aria-live="polite" className="block">
                      <span className="sr-only">Loading barangays...</span>
                      <Skeleton className="h-10 w-full" />
                    </output>
                  ) : (
                    <IconInput icon="building">
                      <select
                        id="barangay_id"
                        name="barangay_id"
                        value={form.barangay_id}
                        onChange={onChange}
                        required
                        disabled={barangays.length === 0}
                        className={`${compactInput} !pl-10`}
                      >
                        <option value="">Where did it happen?</option>

                        {barangays.map((barangay) => (
                          <option key={barangay.id} value={barangay.id}>
                            {barangay.name}
                          </option>
                        ))}
                      </select>
                    </IconInput>
                  )}
                </Field>

                <Field id="location" label="Specific location">
                  <IconInput icon="pin">
                    <input
                      id="location"
                      name="location"
                      value={form.location}
                      onChange={onChange}
                      required
                      placeholder="Street, landmark, or nearby place"
                      className={`${compactInput} !pl-10`}
                    />
                  </IconInput>
                </Field>
              </div>

              <Field
                id="description"
                label="Complaint details"
                right={
                  <span
                    className={`text-xs ${
                      descriptionLength > 4500
                        ? "text-amber-700"
                        : "text-slate-500"
                    }`}
                  >
                    {descriptionLength}/5000
                  </span>
                }
              >
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  required
                  rows={3}
                  maxLength={5000}
                  placeholder="What happened? Where and when did it happen? Provide the details you know."
                  className={`${inputClass} resize-y !py-2 !text-sm`}
                />
              </Field>

              <Field
                id="evidence"
                label="Supporting evidence"
                icon="image"
                optional
              >
                <EvidencePicker
                  id="evidence"
                  file={evidence}
                  previewUrl={evidencePreviewUrl}
                  onChange={onEvidenceChange}
                />
              </Field>

              <label className="glass-soft flex items-start gap-3 rounded-xl p-3 text-sm">
                <input
                  type="checkbox"
                  name="is_anonymous"
                  checked={form.is_anonymous}
                  onChange={(event) => onAnonymousChange(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                />
                <span>
                  <span className="block font-medium text-slate-900">Submit anonymously</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-600">Your identity is hidden</span>
                </span>
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-2.5 sm:flex-row sm:justify-end">
              <Link to="/citizen/dashboard" className={secondaryBtn}>
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingFormData ||
                  categories.length === 0 ||
                  barangays.length === 0
                }
                className={`${primaryBtn} gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {submitting ? "Submitting..." : "Submit complaint"}

                {!submitting && (
                  <Glyph name="arrowUp" className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
    </>
  );
}
