import { focusRing, inputClass } from "../../components/ui";

/* ---------- Small presentational helpers (UI only) ---------- */

export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

export function CheckIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function XIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function MetaItem({ label, value }) {
  return (
    <div className="glass-soft rounded-xl px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function DecisionButton({ active, tone, title, hint, icon, onClick, disabled }) {
  const tones = {
    accept: {
      active: "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20",
      badgeActive: "bg-emerald-600 text-white",
      titleActive: "text-emerald-900",
    },
    decline: {
      active: "border-red-500 bg-red-50 ring-2 ring-red-500/20",
      badgeActive: "bg-red-600 text-white",
      titleActive: "text-red-900",
    },
  }[tone];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
        active
          ? tones.active
          : `border-slate-200 bg-white ${
              disabled ? "" : "hover:border-slate-300 hover:bg-slate-50"
            }`
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
          active
            ? tones.badgeActive
            : `bg-slate-100 text-slate-500 ${
                disabled ? "" : "group-hover:bg-slate-200"
              }`
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-semibold ${
            active ? tones.titleActive : "text-slate-900"
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      </span>

      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          active
            ? tone === "accept"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-red-600 bg-red-600 text-white"
            : "border-slate-300 bg-white text-transparent"
        }`}
        aria-hidden="true"
      >
        <CheckIcon className="h-3 w-3" />
      </span>
    </button>
  );
}

export function LevelOption({ active, title, hint, onClick, disabled }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full flex-col rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
        active
          ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20"
          : `border-slate-200 bg-white ${
              disabled ? "" : "hover:border-slate-300 hover:bg-slate-50"
            }`
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={`text-sm font-semibold ${
            active ? "text-emerald-900" : "text-slate-900"
          }`}
        >
          {title}
        </span>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
            active
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 text-transparent"
          }`}
          aria-hidden="true"
        >
          <CheckIcon className="h-3 w-3" />
        </span>
      </span>
      <span className="mt-1 text-xs leading-5 text-slate-500">{hint}</span>
    </button>
  );
}

export function PriorityField({ value, onChange, disabled }) {
  return (
    <div>
      <label
        htmlFor="complaint-priority"
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        Complaint priority
      </label>
      <select
        id="complaint-priority"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    </div>
  );
}

