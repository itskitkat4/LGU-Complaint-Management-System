
import { Link } from "react-router-dom";
import CitizenLayout from "../../layouts/CitizenLayout";

function BellIcon({ className = "h-6 w-6" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
      <path
        d="M12 11v5m0-8h.01"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NotificationIcon() {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
      <BellIcon className="h-8 w-8" />
    </div>
  );
}

export default function Notifications() {
  return (
    <CitizenLayout title="Notifications">
      <section className="space-y-6">

        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Citizen Portal
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Notifications
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Stay updated on the progress of your complaints.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600">
            <BellIcon className="h-5 w-5 text-emerald-700" />
            No unread notifications
          </div>
        </div>

        {/* Recent Activity */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 className="font-semibold text-slate-900">
              Recent Activity
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Updates related to your submitted complaints
            </p>
          </div>

          {/* Empty State */}
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-20">
            <NotificationIcon />

            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              You're all caught up!
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              You don't have any notifications yet. We'll notify you
              whenever there are updates about your complaints.
            </p>

            <Link
              to="/citizen/complaints"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              View My Complaints
            </Link>
          </div>
        </section>

        {/* Information */}
        <section className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <div className="mt-0.5 shrink-0 text-blue-700">
            <InfoIcon />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-blue-900">
              Stay informed
            </h3>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              Check your notifications regularly to keep track of
              reviews, assignments, and resolution updates for your
              complaints.
            </p>
          </div>
        </section>

      </section>
    </CitizenLayout>
  );
}
