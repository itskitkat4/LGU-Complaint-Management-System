import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, Panel, StatCard, focusRing, primaryBtn } from "../../components/ui";

const stats = [
  { label: "Pending review", value: "12", description: "Complaints awaiting initial review", icon: "clock", tone: "bg-amber-50 text-amber-700" },
  { label: "In progress", value: "24", description: "Currently being handled", icon: "progress", tone: "bg-sky-50 text-sky-700" },
  { label: "For resolution review", value: "5", description: "Awaiting staff decision", icon: "file", tone: "bg-slate-100 text-slate-700" },
  { label: "Resolved", value: "86", description: "Illustrative completed count", icon: "check", tone: "bg-emerald-50 text-emerald-700" },
];

const actions = [
  {
    to: "/staff/complaints",
    icon: "file",
    title: "Review complaint queue",
    text: "Check new complaints and decide the handling level",
  },
  {
    to: "/staff/complaints",
    icon: "check",
    title: "Review resolutions",
    text: "Inspect completed work and supporting evidence",
  },
];

export default function Dashboard() {
  return (
    <StaffLayout title="LGU Staff Dashboard" role="LGU Staff">
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Overview
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Monitor complaint review and resolution progress.
            </p>
          </div>
          <Link to="/staff/complaints" className={primaryBtn}>
            Open complaint queue
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </section>

        <section aria-labelledby="overview-title">
          <h2 id="overview-title" className="sr-only">
            Complaint overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Illustrative statistics only; not connected to the database.
          </p>
        </section>

        <Panel title="Staff actions" description="Common tasks for LGU staff.">
          <div className="-my-2 divide-y divide-slate-100">
            {actions.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className={`group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3.5 transition-colors hover:bg-slate-50 ${focusRing}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                  <Icon name={action.icon} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{action.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{action.text}</span>
                </span>
                <Icon
                  name="arrow"
                  className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </StaffLayout>
  );
}