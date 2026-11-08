import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import {
  Icon,
  Panel,
  StatCard,
  focusRing,
  primaryBtn,
} from "../../components/ui";

const stats = [
  {
    label: "Pending Review",
    value: "12",
    description: "Complaints awaiting initial review",
    icon: "clock",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    label: "In Progress",
    value: "24",
    description: "Complaints currently being handled",
    icon: "progress",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    label: "For Resolution Review",
    value: "5",
    description: "Resolutions awaiting your decision",
    icon: "file",
    tone: "bg-violet-50 text-violet-700",
  },
  {
    label: "Resolved",
    value: "86",
    description: "Complaints with approved resolutions",
    icon: "check",
    tone: "bg-emerald-50 text-emerald-700",
  },
];

const actions = [
  {
    to: "/staff/complaints",
    icon: "file",
    title: "Review Complaint Queue",
    text: "Review newly submitted complaints and determine their handling level.",
  },
  {
    to: "/staff/complaints",
    icon: "check",
    title: "Review Resolutions",
    text: "Evaluate completed actions and verify supporting evidence.",
  },
];

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

export default function Dashboard() {
  const loading = false; // TODO: replace with useState/fetch state once connected to the backend

  return (
    <StaffLayout title="LGU Staff Dashboard" role="LGU Staff">
      <div className="space-y-8">

        {/* Page Heading */}
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              LGU Staff Portal
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Overview
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Monitor submitted complaints, review resolutions, and track
              the progress of citizen concerns.
            </p>
          </div>

          <Link to="/staff/complaints" className={primaryBtn}>
            <Icon name="file" className="h-4 w-4" />
            Open Complaint Queue
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </section>

        {/* Statistics */}
        <section aria-labelledby="overview-title">
          <div className="mb-4">
            <h3
              id="overview-title"
              className="text-base font-semibold text-slate-900"
            >
              Complaint Overview
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Summary of complaint handling activities.
            </p>
          </div>

          {loading ? (
            <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <span className="sr-only">Loading complaint statistics...</span>

              {stats.map((stat) => (
                <div
                  key={stat.label}
                  aria-hidden="true"
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="mt-3 h-9 w-14 rounded" />
                    </div>
                    <Skeleton className="h-11 w-11 rounded-xl" />
                  </div>
                  <Skeleton className="mt-4 h-3 w-44 max-w-full rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">
            Sample figures for UI development. Actual statistics will come
            from the backend.
          </p>
        </section>

        {/* Staff Actions */}
        <Panel
          title="Staff Actions"
          description="Quick access to your main complaint management tasks."
        >
          {loading ? (
            <div role="status" className="-my-2 divide-y divide-slate-100">
              <span className="sr-only">Loading staff actions...</span>

              {actions.map((action) => (
                <div
                  key={action.title}
                  aria-hidden="true"
                  className="flex items-center gap-3 py-4"
                >
                  <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-3 w-full max-w-md rounded" />
                  </div>
                  <Skeleton className="h-4 w-4 shrink-0 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="-my-2 divide-y divide-slate-100">
              {actions.map((action) => (
                <Link
                  key={action.title}
                  to={action.to}
                  className={`group -mx-2 flex items-center gap-3 rounded-lg px-2 py-4 transition-colors hover:bg-slate-50 ${focusRing}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon name={action.icon} className="h-5 w-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {action.title}
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {action.text}
                    </span>
                  </span>

                  <Icon
                    name="arrow"
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>
              ))}
            </div>
          )}
        </Panel>

      </div>
    </StaffLayout>
  );
}