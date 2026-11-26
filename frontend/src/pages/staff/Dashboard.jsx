import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import {
  Icon,
  Panel,
  StatCard,
  focusRing,
} from "../../components/ui";
import { getStaffDashboardSummary } from "../../lib/api";
import FeedbackMonitoring from "../shared/FeedbackMonitoring";

const statDefinitions = [
  { key: "submitted", label: "Submitted", description: "Awaiting initial review", icon: "file", tone: "bg-slate-100 text-slate-700" },
  { key: "under_review", label: "Under Review", description: "Currently being assessed", icon: "clock", tone: "bg-amber-50 text-amber-700" },
  { key: "accepted", label: "Accepted", description: "Accepted for processing", icon: "check", tone: "bg-emerald-50 text-emerald-700" },
  { key: "declined", label: "Declined", description: "Declined with a recorded reason", icon: "x", tone: "bg-rose-50 text-rose-700" },
  { key: "assigned", label: "Assigned", description: "Routed to a handling unit or handler", icon: "users", tone: "bg-slate-100 text-slate-700" },
  { key: "in_progress", label: "In Progress", description: "Currently being handled", icon: "progress", tone: "bg-sky-50 text-sky-700" },
  { key: "resolved", label: "Resolved", description: "Approved and complete", icon: "check", tone: "bg-emerald-50 text-emerald-700" },
  { key: "total_complaints", label: "Total Complaints", description: "All recorded complaints", icon: "grid", tone: "bg-slate-100 text-slate-700" },
  { key: "resolutions_pending_review", label: "Resolutions Pending Review", description: "Resolution submissions awaiting a decision", icon: "file", tone: "bg-violet-50 text-violet-700" },
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
    const result = await getStaffDashboardSummary();
    if (!isValidStatistics(result?.statistics)) {
      throw new Error("The dashboard summary response is incomplete or invalid.");
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
          setError(loadError.message || "Unable to load complaint statistics.");
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
    <StaffLayout title="LGU Staff Dashboard" role="LGU Staff">
      <div className="space-y-8">
        <section className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-emerald-700">LGU Staff Portal</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Overview</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Monitor complaint lifecycle status and review submitted resolutions.
              </p>
              <span className="mt-3 block h-1 w-20 rounded-full bg-emerald-500" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section aria-labelledby="overview-title">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <div>
              <h3 id="overview-title" className="text-base font-semibold text-slate-900">Complaint Overview</h3>
              <p className="mt-1 text-sm text-slate-500">
                Complaint lifecycle counts and the separate resolution review queue.
              </p>
            </div>
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

          {isLoading && (
            <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <span className="sr-only">Loading complaint statistics...</span>
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
              {statistics.total_complaints === 0 && (
                <p className="mt-3 text-sm text-slate-500">There are no complaints recorded yet.</p>
              )}
            </>
          )}
        </section>

        <Panel title="Staff Actions" description="Quick access to your main complaint management tasks.">
          <div className="-my-2 divide-y divide-slate-100">
            {actions.map((action) => (
              <Link key={action.title} to={action.to} className={`glass-hover group -mx-2 flex items-center gap-3 rounded-xl px-2 py-4 ${focusRing}`}>
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
        <FeedbackMonitoring compact />
      </div>
    </StaffLayout>
  );
}