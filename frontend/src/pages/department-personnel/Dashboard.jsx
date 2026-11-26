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
import { getDepartmentPersonnelDashboardSummary } from "../../lib/api";

const statDefinitions = [
  { key: "my_assignments", label: "My Assignments", description: "Complaints in your active assignment", icon: "file", tone: "bg-slate-100 text-slate-700" },
  { key: "in_progress", label: "In Progress", description: "Your assignments currently being handled", icon: "progress", tone: "bg-sky-50 text-sky-700" },
  { key: "returned_for_follow_up", label: "Returned for Follow-up", description: "Latest resolution was returned for more work", icon: "clock", tone: "bg-amber-50 text-amber-700" },
  { key: "resolutions_pending_review", label: "Submitted for Review", description: "Your resolution submissions awaiting review", icon: "check", tone: "bg-emerald-50 text-emerald-700" },
];

const actions = [
  {
    to: "/personnel/assignments",
    icon: "file",
    title: "View My Assignments",
    text: "Open assigned complaints, document actions, and submit supporting evidence.",
  },
];

function isValidStatistics(value) {
  return value && statDefinitions.every(({ key }) =>
    Number.isInteger(value[key]) && value[key] >= 0
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`} />;
}

export default function Dashboard() {
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const loadDashboard = useCallback(async () => {
    const result = await getDepartmentPersonnelDashboardSummary();
    if (!isValidStatistics(result?.statistics)) {
      throw new Error("The personnel dashboard response is incomplete or invalid.");
    }
    return result.statistics;
  }, []);

  useEffect(() => {
    let active = true;

    loadDashboard()
      .then((result) => {
        if (active) {
          setStatistics(result);
          setError("");
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Unable to load assignment statistics.");
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
    <StaffLayout title="Personnel Dashboard" role="Department Personnel">
      <div className="space-y-8">
        <section className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-emerald-700">Department Personnel Portal</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your Work Overview</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Manage your active assignments, document completed actions, and submit resolutions for review.
              </p>
              <span className="mt-3 block h-1 w-20 rounded-full bg-emerald-500" aria-hidden="true" />
            </div>
            <Link to="/personnel/assignments" className={primaryBtn}>
              <Icon name="file" className="h-4 w-4" />
              View My Assignments
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="overview-title">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <div>
              <h3 id="overview-title" className="text-base font-semibold text-slate-900">Assignment Overview</h3>
              <p className="mt-1 text-sm text-slate-500">Counts are limited to your active LGU assignments.</p>
            </div>
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

          {isLoading && (
            <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <span className="sr-only">Loading assignment statistics...</span>
              {statDefinitions.map((stat) => (
                <div key={stat.key} aria-hidden="true" className="glass rounded-2xl p-5">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="mt-3 h-9 w-14 rounded" />
                  <Skeleton className="mt-4 h-3 w-44 max-w-full rounded" />
                </div>
              ))}
            </div>
          )}

          {statistics && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statDefinitions.map((stat) => (
                  <StatCard key={stat.key} {...stat} value={statistics[stat.key]} />
                ))}
              </div>
              {statistics.my_assignments === 0 && (
                <p className="mt-3 text-sm text-slate-500">You have no active assignments.</p>
              )}
            </>
          )}
        </section>

        <Panel title="Quick Actions" description="Common tasks for your assigned work.">
          <div className="-my-2 divide-y divide-slate-100">
            {actions.map((action) => (
              <Link key={action.to} to={action.to} className={`glass-hover group -mx-2 flex items-center gap-3 rounded-xl px-2 py-4 ${focusRing}`}>
                <span className="glass-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                  <Icon name={action.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{action.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{action.text}</span>
                </span>
                <Icon name="arrow" className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </StaffLayout>
  );
}