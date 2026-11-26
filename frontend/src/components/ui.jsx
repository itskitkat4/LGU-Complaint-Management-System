// Shared keyboard focus style
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

// Shared primary button style
export const primaryBtn =
  `glass-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${focusRing}`;
export const secondaryBtn =
  `glass-btn-secondary inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 ${focusRing}`;
// Shared input field style
export const inputClass =
  `glass-input w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 ${focusRing}`;

// Reusable SVG Icon component
export function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),

    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),

    plus: <path d="M12 5v14M5 12h14" />,

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
      </>
    ),

    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,

    back: <path d="M19 12H5M11 6l-6 6 6 6" />,

    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    progress: (
      <>
        <path d="M21 12a9 9 0 1 1-9-9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),

    pin: (
      <>
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),

    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),

    building: (
      <>
        <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M2 21h20M16 9h2a2 2 0 0 1 2 2v10" />
        <path d="M8 7h4M8 11h4M8 15h4M8 21v-2h4v2" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z" transform="translate(-1 -1)" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    "user-plus": (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M3 21a6 6 0 0 1 12 0M19 8v6M16 11h6" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3" />
      </>
    ),

    "refresh-cw": (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3" />
      </>
    ),

    history: (
      <>
        <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),

    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,

    message: (
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    inbox: (
      <>
        <path d="M4 4h16v12h-4l-2 3h-4l-2-3H4z" />
        <path d="M4 12h4l2 3h4l2-3h4" />
      </>
    ),

    alert: (
      <>
        <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),

    x: <path d="m18 6-12 12M6 6l12 12" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,

    type: <path d="M4 7V4h16v3M9 20h6M12 4v16" />,
    tag: (
      <>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7" cy="7" r="1" />
      </>
    ),

    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),

    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5v.01" />
      </>
    ),

    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-5 5" />
      </>
    ),

    megaphone: (
      <>
        <path d="m3 11 18-5v12L3 13v-2Z" />
        <path d="M11 15.5 13 21h-4l-2-7" />
      </>
    ),

    menu: <path d="M4 6h16M4 12h16M4 18h16" />,

    sparkle: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
        <path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" />
      </>
    ),

    upload: (
      <>
        <path d="M12 16V4m-5 5 5-5 5 5" />
        <path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.file}</svg>;
}

// Reusable statistics card
export function StatCard({
  label,
  value,
  description,
  icon = "file",
  tone = "glass-icon",
}) {
  return (
    <article className="glass rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone}`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
// Reusable content panel
export function Panel({
  title,
  description,
  action,
  children,
}) {
  return (
    <section className="glass rounded-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500"
            aria-hidden="true"
          />

          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}


const priorityStyles = {
  high: "bg-red-50 text-red-700 ring-red-600/20",
  urgent: "bg-red-50 text-red-700 ring-red-600/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  normal: "bg-slate-100 text-slate-700 ring-slate-600/20",
  low: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export function PriorityBadge({ priority = "Normal" }) {
  const style =
    priorityStyles[String(priority).toLowerCase()] ||
    priorityStyles.normal;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {priority}
    </span>
  );
}

const statusStyles = {
  "pending review": "bg-amber-50 text-amber-700 ring-amber-600/20",
  assigned: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "in progress": "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  in_progress: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  "returned for follow-up": "bg-orange-50 text-orange-700 ring-orange-600/20",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  submitted: "bg-sky-50 text-sky-700 ring-sky-600/20",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-red-50 text-red-700 ring-red-600/20",
  "under review": "bg-amber-50 text-amber-700 ring-amber-600/20",
  under_review: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

export function StatusBadge({ status = "Unknown" }) {
  const style =
    statusStyles[String(status).toLowerCase()] ||
    "bg-slate-100 text-slate-700 ring-slate-600/20";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}