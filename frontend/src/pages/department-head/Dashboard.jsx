
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import {
  Icon,
  Panel,
  StatCard,
  focusRing,
  primaryBtn,
} from "../../components/ui";
import { getDepartmentMonitoring } from "../../lib/api";

const statDefinitions = [
  {
    key: "awaiting_assignment",
    label: "Awaiting Assignment",
    description: "Complaints needing personnel assignment",
    icon: "clock",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    key: "assigned",
    label: "Assigned",
    description: "Assigned to department personnel",
    icon: "users",
    tone: "bg-slate-100 text-slate-700",
  },
  {
    key: "in_progress",
    label: "In Progress",
    description: "Complaints currently being handled",
    icon: "progress",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    key: "resolved",
    label: "Resolved",
    description: "Complaints marked as resolved",
    icon: "check",
    tone: "bg-emerald-50 text-emerald-700",
  },
];

const actions = [
  {
    to: "/department/monitoring",
    icon: "chart",
    title: "Monitor Department Work",
    text: "Review current handlers, complaint status, and external escalations.",
  },
  {
    to: "/department/assignments",
    icon: "users",
    title: "Manage Personnel Assignments",
    text: "Assign department personnel to LGU-level complaints and monitor their workload.",
  },
];

export default function Dashboard() {
  const [statistics, setStatistics] = useState(null);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let active = true;

    getDepartmentMonitoring(1)
      .then((result) => {
        if (active) setStatistics(result.statistics || {});
      })
      .catch((error) => {
        if (active) setStatsError(error.message || "Unable to load department statistics.");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <StaffLayout title="Department Dashboard" role="Department Head">
      <div className="space-y-8">

        {/* Page Heading */}
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Department Portal
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Department Overview
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Coordinate complaint assignments, manage personnel workload,
              and monitor the progress of department-handled complaints.
            </p>
          </div>

          <Link to="/department/assignments" className={primaryBtn}>
            <Icon name="users" className="h-4 w-4" />
            Manage Assignments
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </section>

        {/* Department Statistics */}
        <section aria-labelledby="overview-title">
          <div className="mb-4">
            <h3
              id="overview-title"
              className="text-base font-semibold text-slate-900"
            >
              Department Complaint Overview
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Summary of complaint assignments and handling progress.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statDefinitions.map((stat) => (
              <StatCard key={stat.label} {...stat} value={statistics?.[stat.key] ?? "—"} />
            ))}
          </div>

          {statsError && <p role="alert" className="mt-3 text-sm text-red-700">{statsError}</p>}
        </section>

        {/* Quick Actions */}
        <Panel
          title="Quick Actions"
          description="Common tasks for your department."
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
