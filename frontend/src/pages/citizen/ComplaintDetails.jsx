import { Link, useParams } from "react-router-dom";
import CitizenLayout from "../../layouts/CitizenLayout";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    back: <path d="m15 18-6-6 6-6M9 12h12" />,
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

const complaint = {
  reference: "BS-DEMO-001",
  title: "Uncollected garbage",
  category: "Garbage and Sanitation",
  location: "Sample location",
  submitted: "Sample date",
  status: "Under Review",
  description: "Sample complaint details are displayed here.",
  updates: [
    { title: "Complaint Submitted", date: "Awaiting live data", done: true },
    { title: "Initial Review", date: "Pending update", done: false },
    { title: "Assigned for Action", date: "Pending update", done: false },
    { title: "Resolution Review", date: "Pending update", done: false },
  ],
};

/* Same status colors as the dashboard stat cards. */
const statusStyles = {
  "Under Review": "bg-amber-50 text-amber-800 ring-amber-200",
  "In Progress": "bg-sky-50 text-sky-800 ring-sky-200",
  Resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

const defaultStatusStyle = "bg-slate-100 text-slate-700 ring-slate-200";

export default function ComplaintDetails() {
  const { id } = useParams();

  const reference = id || complaint.reference;
  const statusStyle = statusStyles[complaint.status] || defaultStatusStyle;
  const currentIndex = complaint.updates.findIndex((item) => !item.done);

  const details = [
    { label: "Reference", value: reference },
    { label: "Category", value: complaint.category },
    { label: "Location", value: complaint.location },
    { label: "Submitted", value: complaint.submitted },
  ];

  return (
    <CitizenLayout title="Complaint details">
      {/* Page heading (same pattern as the dashboard greeting) */}
      <section className="space-y-5">
        <Link
          to="/citizen/complaints"
          className={`inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-600 transition-colors hover:text-emerald-800 ${focusRing}`}
        >
          <Icon name="back" className="h-4 w-4" />
          My complaints
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {complaint.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {complaint.category} · Reference {reference}
            </p>
          </div>

          <span
            className={`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyle}`}
          >
            {complaint.status}
          </span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        {/* Left column */}
        <div className="space-y-6">
          <Panel title="Complaint information" description="What you reported.">
            <p className="text-sm leading-7 text-slate-700">{complaint.description}</p>
          </Panel>

          <Panel title="Details" description="Key facts about this complaint.">
            <dl className="space-y-4 text-sm">
              {details.map((item) => (
                <div key={item.label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{item.label}</dt>
                  <dd className="break-words text-right font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        {/* Status history */}
        <div className="xl:self-start">
          <Panel title="Status history" description="Progress on your complaint.">
            <ol>
              {complaint.updates.map((item, index) => {
                const isLast = index === complaint.updates.length - 1;
                const isCurrent = index === currentIndex;

                return (
                  <li key={item.title} className="relative flex gap-4 pb-6 last:pb-0">
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`absolute top-8 left-[15px] h-[calc(100%-2rem)] w-px ${
                          item.done ? "bg-emerald-700" : "bg-slate-200"
                        }`}
                      />
                    )}

                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        item.done
                          ? "bg-emerald-700 text-white"
                          : isCurrent
                            ? "bg-white text-emerald-800 ring-2 ring-emerald-700"
                            : "bg-white text-slate-400 ring-2 ring-slate-200"
                      }`}
                    >
                      {item.done ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          aria-hidden="true"
                        >
                          <path
                            d="m5 12.5 4.5 4.5L19 7.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>

                    <div className="min-w-0 pt-1">
                      <p
                        className={`text-sm font-semibold ${
                          item.done || isCurrent ? "text-slate-900" : "text-slate-500"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {isCurrent ? `In progress · ${item.date}` : item.date}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Preview only. Connect the complaint API to show actual records and status
        history.
      </p>
    </CitizenLayout>
  );
}
