import { useCallback, useEffect, useState } from "react";
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
import FeedbackMonitoring from "../shared/FeedbackMonitoring";

const statDefinitions = [
  {
    key: "awaiting_assignment",
    label: "Awaiting Assignment",
    description: "Assigned to you and awaiting personnel assignment",
    icon: "clock",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    key: "assigned",
    label: "Assigned",
    description: "Assigned lifecycle status across department handlers",
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
  const [isLoading, setIsLoading] = useState(true);
  const loadDashboard = useCallback(async () => {
    const result = await getDepartmentMonitoring(1);
    const counts = result?.status_counts;
    const awaitingAssignment = result?.assignment_counts?.awaiting_assignment;
    const statuses = [
      "submitted",
      "under_review",
      "accepted",
      "declined",
      "assigned",
      "in_progress",
      "resolved",
    ];

    if (
      !counts ||
      !statuses.every((status) =>
        Number.isInteger(counts[status]) && counts[status] >= 0
      ) ||
      !Number.isInteger(awaitingAssignment) ||
      awaitingAssignment < 0
    ) {
      throw new Error("The department monitoring response is incomplete or invalid.");
    }

    return {
      ...counts,
      awaiting_assignment: awaitingAssignment,
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadDashboard()
      .then((result) => {
        if (active) {
          setStatistics(result);
          setStatsError("");
        }
      })
      .catch((error) => {
        if (active) {
          setStatsError(error.message || "Unable to load department statistics.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadDashboard]);

  return (
    <StaffLayout title="Department Dashboard" role="Department Head">
      <div className="space-y-8">
        {/* Page Heading */}
        <section className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
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

              <span className="mt-3 block h-1 w-20 rounded-full bg-emerald-500" aria-hidden="true" />
            </div>

            <Link to="/department/assignments" className={primaryBtn}>
              <Icon name="users" className="h-4 w-4" />
              Manage Assignments
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Department Statistics */}
        <section aria-labelledby="overview-title">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <div>
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
          </div>

          {statsError && <p role="alert" className="mt-3 text-sm text-red-700">{statsError}</p>}

          {isLoading && (
            <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <span className="sr-only">Loading department statistics...</span>
              {statDefinitions.map((stat) => (
                <div key={stat.key} aria-hidden="true" className="glass rounded-2xl p-5">
                  <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                  <div className="mt-3 h-9 w-14 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 h-3 w-44 max-w-full animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          )}

          {statistics && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statDefinitions.map((stat) => (
                  <StatCard key={stat.label} {...stat} value={statistics[stat.key]} />
                ))}
              </div>
              {Object.values(statistics).every((count) => count === 0) && (
                <p className="mt-3 text-sm text-slate-500">There are no complaints in your department&apos;s active assignments.</p>
              )}
            </>
          )}
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
                className={`glass-hover group -mx-2 flex items-center gap-3 rounded-xl px-2 py-4 ${focusRing}`}
              >
                <span className="glass-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
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
        <FeedbackMonitoring compact />

      </div>
    </StaffLayout>
  );
}