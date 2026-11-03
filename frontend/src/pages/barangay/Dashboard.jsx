
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
    label: "Assigned Complaints",
    value: "8",
    description: "Complaints routed to your barangay",
    icon: "file",
    tone: "bg-slate-100 text-slate-700",
  },
  {
    label: "In Progress",
    value: "5",
    description: "Complaints currently being handled",
    icon: "progress",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    label: "Awaiting Follow-up",
    value: "2",
    description: "Complaints requiring further action",
    icon: "clock",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    label: "Completed",
    value: "14",
    description: "Complaints marked as resolved",
    icon: "check",
    tone: "bg-emerald-50 text-emerald-700",
  },
];

const actions = [
  {
    to: "/barangay/complaints",
    icon: "file",
    title: "View Assigned Complaints",
    text: "Review complaint details, monitor progress, and follow up on pending concerns.",
  },
];

export default function Dashboard() {
  return (
    <StaffLayout title="Barangay Dashboard" role="Barangay Head"
      links={[
        { to: "/barangay/dashboard", label: "Dashboard" },
        { to: "/barangay/complaints", label: "Assigned Complaints" },
      ]}
    >
      <div className="space-y-8">

        {/* Page Heading */}
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Barangay Portal
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Community Complaint Overview
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Monitor complaints routed to your barangay and track their
              progress toward resolution.
            </p>
          </div>

          <Link to="/barangay/complaints" className={primaryBtn}>
            <Icon name="file" className="h-4 w-4" />
            View Assigned Complaints
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </section>

        {/* Complaint Statistics */}
        <section aria-labelledby="overview-title">
          <div className="mb-4">
            <h3
              id="overview-title"
              className="text-base font-semibold text-slate-900"
            >
              Complaint Overview
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Summary of complaints handled by your barangay.
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

        {/* Quick Actions */}
        <Panel
          title="Quick Actions"
          description="Common tasks for your barangay."
        >
          <div className="-my-2 divide-y divide-slate-100">
            {actions.map((action) => (
              <Link
                key={action.to}
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
