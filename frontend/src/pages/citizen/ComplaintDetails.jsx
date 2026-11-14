
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CitizenLayout from "../../layouts/CitizenLayout";
import {
  Icon,
  Panel,
  StatusBadge,
  focusRing,
} from "../../components/ui";
import { getCitizenComplaint } from "../../lib/api";

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  return new Date(date).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatus(status) {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ComplaintDetails() {
  const { id } = useParams();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadComplaint() {
      if (!id) {
        setError("Complaint ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await getCitizenComplaint(id);

        if (isMounted) {
          setComplaint(result.complaint);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load complaint details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadComplaint();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const details = complaint
    ? [
        {
          label: "Reference",
          value: complaint.reference_number || complaint.id,
        },
        {
          label: "Category",
          value: complaint.category?.name || "Not specified",
        },
        {
          label: "Location",
          value:
            complaint.location ||
            complaint.barangay?.name ||
            "Not specified",
        },
        {
          label: "Submitted",
          value: formatDate(complaint.created_at),
        },
      ]
    : [];

  const updates = complaint?.updates || [];
  const resolutions = complaint?.resolutions || [];
  const attachments = complaint?.attachments || [];

  return (
    <CitizenLayout title="Complaint details">
      <section className="space-y-5">
        <Link
          to="/citizen/complaints"
          className={`inline-flex items-center gap-1.5 rounded text-sm font-medium text-slate-600 transition-colors hover:text-emerald-800 ${focusRing}`}
        >
          <Icon name="back" className="h-4 w-4" />
          My complaints
        </Link>

        {loading ? (
          <div
            role="status"
            className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
          >
            <span className="sr-only">
              Loading complaint details...
            </span>

            <div aria-hidden="true" className="min-w-0 flex-1">
              <Skeleton className="h-8 w-72 max-w-full rounded" />
              <Skeleton className="mt-3 h-4 w-64 max-w-full rounded" />
            </div>

            <Skeleton
              aria-hidden="true"
              className="h-7 w-28 rounded-full"
            />
          </div>
        ) : complaint ? (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {complaint.title}
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {complaint.category?.name || "Uncategorized"} ·
                {" "}Reference {complaint.reference_number || complaint.id}
              </p>
            </div>

            <StatusBadge status={complaint.status} />
          </div>
        ) : null}
      </section>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-medium text-red-800">
            {error}
          </p>

          <Link
            to="/citizen/complaints"
            className="mt-2 inline-block text-sm font-semibold text-red-800 underline"
          >
            Return to my complaints
          </Link>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <div className="space-y-6">
            <Panel title="Complaint information">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="mt-3 h-4 w-full rounded" />
              <Skeleton className="mt-3 h-4 w-2/3 rounded" />
            </Panel>

            <Panel title="Details">
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex justify-between gap-4"
                  >
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-36 rounded" />
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Status history">
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex gap-4">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : complaint ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <div className="space-y-6">
            <Panel
              title="Complaint information"
              description="What you reported."
            >
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {complaint.description || "No description provided."}
              </p>
            </Panel>

            <Panel
              title="Details"
              description="Key facts about this complaint."
            >
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
            </Panel>

            <Panel
              title="Submitted evidence"
              description="Files attached to your complaint."
            >
              {attachments.length > 0 ? (
                <ul className="space-y-3">
                  {attachments.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <Icon
                        name="file"
                        className="h-5 w-5 shrink-0 text-slate-500"
                      />

                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-slate-800">
                          {file.file_name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {file.mime_type || "File"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No evidence files attached.
                </p>
              )}
            </Panel>

            {resolutions.length > 0 && (
              <Panel
                title="Approved resolution"
                description="Resolution information approved by LGU staff."
              >
                <div className="space-y-5">
                  {resolutions.map((resolution) => (
                    <div
                      key={resolution.id}
                      className="space-y-3"
                    >
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {resolution.resolution_description}
                      </p>

                      {resolution.attachments?.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold text-slate-500">
                            Resolution evidence
                          </p>

                          <ul className="space-y-2">
                            {resolution.attachments.map((file) => (
                              <li
                                key={file.id}
                                className="flex items-center gap-2 text-sm text-slate-700"
                              >
                                <Icon
                                  name="file"
                                  className="h-4 w-4 text-slate-500"
                                />
                                {file.file_name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {resolution.reviewed_at && (
                        <p className="text-xs text-slate-500">
                          Approved on {formatDate(resolution.reviewed_at)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          <div className="xl:self-start">
            <Panel
              title="Status history"
              description="Recorded progress on your complaint."
            >
              {updates.length > 0 ? (
                <ol>
                  {updates.map((item, index) => {
                    const isLast = index === updates.length - 1;

                    return (
                      <li
                        key={item.id}
                        className="relative flex gap-4 pb-6 last:pb-0"
                      >
                        {!isLast && (
                          <span
                            aria-hidden="true"
                            className="absolute top-8 left-[15px] h-[calc(100%-2rem)] w-px bg-emerald-700"
                          />
                        )}

                        <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                          <Icon
                            name="check"
                            className="h-4 w-4"
                          />
                        </span>

                        <div className="min-w-0 pt-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatStatus(item.new_status)}
                          </p>

                          {item.comment && (
                            <p className="mt-1 text-sm text-slate-600">
                              {item.comment}
                            </p>
                          )}

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-sm text-slate-500">
                  No status history has been recorded yet.
                </p>
              )}
            </Panel>
          </div>
        </div>
      ) : null}
    </CitizenLayout>
  );
}
