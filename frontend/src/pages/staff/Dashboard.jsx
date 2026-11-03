
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

export default function Dashboard() {
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

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
        </Panel>

      </div>
    </StaffLayout>
  );
}
