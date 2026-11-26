import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import {
  Icon,
  PriorityBadge,
  StatusBadge,
  primaryBtn,
} from "../../components/ui";
import { getDepartmentPersonnelComplaints } from "../../lib/api";
import { ContentSkeleton } from "../../components/Skeletons";

export default function MyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchAssignments() {
      try {
        setLoading(true);
        setError("");

        const result = await getDepartmentPersonnelComplaints(page);

        if (isMounted) {
          setAssignments(result.data || []);
          setPagination(result.pagination || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load assigned complaints.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAssignments();

    return () => {
      isMounted = false;
    };
  }, [page, reloadKey]);

  const visibleAssignments = assignments.filter((item) => {
    const matchesSearch = `${item.id} ${item.title} ${item.category?.name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <StaffLayout title="My Assignments" role="Department Personnel">
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-14 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              My assignments
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Work on your assigned complaints and keep their progress updated.
            </p>
          </div>
        </div>

        {loading ? (
          <ContentSkeleton label="Loading your assignments" variant="list" rows={3} />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setReloadKey((current) => current + 1);
              }}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : assignments.length === 0 ? (
          <div className="glass rounded-2xl px-5 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
              <Icon name="file" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No assignments yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Complaints assigned to you will appear here.
            </p>
          </div>
        ) : (
          <>
            <section className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search complaint, ID, or category"
                aria-label="Search my assignments"
                className="glass-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:flex-1"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter assignments by status"
                className="glass-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:w-52"
              >
                <option value="all">All statuses</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In progress</option>
              </select>
              <span className="text-sm text-slate-500">{visibleAssignments.length} shown</span>
            </section>

            {visibleAssignments.length === 0 ? (
              <div className="glass rounded-2xl px-5 py-10 text-center">
                <h3 className="font-semibold text-slate-900">No matching assignments</h3>
                <p className="mt-1 text-sm text-slate-500">Try another search or status filter.</p>
              </div>
            ) : (
            <ul className="space-y-4">
              {visibleAssignments.map((item) => (
                <li key={item.id}>
                  <article className="glass flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-4">
                      <span className="glass-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                        <Icon name="file" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">
                          Complaint ID: {item.id}
                        </p>

                        <h3 className="mt-1 text-base font-semibold text-slate-900">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {item.category?.name || "Uncategorized"}
                          {item.barangay?.name
                            ? ` · ${item.barangay.name}`
                            : ""}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <PriorityBadge priority={item.priority} />
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/personnel/assignments/${item.id}`}
                      className={`${primaryBtn} shrink-0`}
                      aria-label={`Open assignment ${item.id}`}
                    >
                      Open assignment
                      <Icon name="arrow" className="h-4 w-4" />
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
            )}

            {pagination && pagination.last_page > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Page {pagination.current_page} of {pagination.last_page}
                  {" · "}
                  {pagination.total} total complaints
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="glass-btn-secondary rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage((current) => current + 1)}
                    className="glass-btn-secondary rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StaffLayout>
  );
}
