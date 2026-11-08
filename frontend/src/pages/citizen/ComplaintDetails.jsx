import { Link, useParams } from "react-router-dom";
import CitizenLayout from "../../layouts/CitizenLayout";
import {
  Icon,
  Panel,
  StatusBadge,
  focusRing,
} from "../../components/ui";

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

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ComplaintDetails() {
  const { id } = useParams();
  const loading = false; // TODO: replace with useState/fetch state once connected to the backend

  const reference = id || complaint.reference;
  const currentIndex = complaint.updates.findIndex(
    (item) => !item.done
  );

  const details = [
    { label: "Reference", value: reference },
    { label: "Category", value: complaint.category },
    { label: "Location", value: complaint.location },
    { label: "Submitted", value: complaint.submitted },
  ];

  return (
    <CitizenLayout title="Complaint details">
      {/* Page heading */}
      <section className="space-y-5">
        <Link
          to="/citizen/complaints"
          className={`inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-600 transition-colors hover:text-emerald-800 ${focusRing}`}
        >
          <Icon name="back" className="h-4 w-4" />
          My complaints
        </Link>

        {loading ? (
          <div role="status" className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <span className="sr-only">Loading complaint details...</span>
            <div aria-hidden="true" className="min-w-0 flex-1">
              <Skeleton className="h-8 w-72 max-w-full rounded" />
              <Skeleton className="mt-3 h-4 w-64 max-w-full rounded" />
            </div>
            <Skeleton aria-hidden="true" className="h-7 w-28 rounded-full" />
          </div>
        ) : (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {complaint.title}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {complaint.category} · Reference {reference}
              </p>
            </div>

            <StatusBadge status={complaint.status} />
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        {/* Left column */}
        <div className="space-y-6">
          <Panel
            title="Complaint information"
            description="What you reported."
          >
            {loading ? (
              <div aria-hidden="true" className="space-y-2.5">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-700">
                {complaint.description}
              </p>
            )}
          </Panel>

          <Panel
            title="Details"
            description="Key facts about this complaint."
          >
            {loading ? (
              <div aria-hidden="true" className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-36 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <dl className="space-y-4 text-sm">
                {details.map((item) => (
                  <div
                    key={item.label}
                    className="flex justify-between gap-4"
                  >
                    <dt className="text-slate-500">
                      {item.label}
                    </dt>

                    <dd className="break-words text-right font-medium text-slate-900">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>
        </div>

        {/* Status history */}
        <div className="xl:self-start">
          <Panel
            title="Status history"
            description="Progress on your complaint."
          >
            {loading ? (
              <div aria-hidden="true" className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-40 rounded" />
                      <Skeleton className="h-3 w-28 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ol>
                {complaint.updates.map((item, index) => {
                  const isLast =
                    index === complaint.updates.length - 1;

                  const isCurrent = index === currentIndex;

                  return (
                    <li
                      key={item.title}
                      className="relative flex gap-4 pb-6 last:pb-0"
                    >
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className={`absolute top-8 left-[15px] h-[calc(100%-2rem)] w-px ${
                            item.done
                              ? "bg-emerald-700"
                              : "bg-slate-200"
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
                          <Icon
                            name="check"
                            className="h-4 w-4"
                          />
                        ) : (
                          index + 1
                        )}
                      </span>

                      <div className="min-w-0 pt-1">
                        <p
                          className={`text-sm font-semibold ${
                            item.done || isCurrent
                              ? "text-slate-900"
                              : "text-slate-500"
                          }`}
                        >
                          {item.title}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {isCurrent
                            ? `In progress · ${item.date}`
                            : item.date}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Preview only. Connect the complaint API to show actual
        records and status history.
      </p>
    </CitizenLayout>
  );
}