import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CitizenLayout from "../../layouts/CitizenLayout";
import {
  announceNotificationsChanged,
  getCitizenNotificationsPage,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../lib/api";

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
    />
  );
}

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
    <div className="glass-icon flex h-16 w-16 items-center justify-center rounded-2xl">
      <BellIcon className="h-8 w-8" />
    </div>
  );
}

function formatNotificationDate(dateValue) {
  if (!dateValue) return "Date unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestSequence.current;
    let isActive = true;

    Promise.all([
      getCitizenNotificationsPage(page, { signal: controller.signal }),
      getUnreadNotificationCount({ signal: controller.signal }),
    ])
      .then(([pageResult, unreadData]) => {
        if (!isActive || requestId !== requestSequence.current) return;

        setNotifications(pageResult.notifications);
        setPagination({
          current_page: pageResult.currentPage,
          last_page: pageResult.lastPage,
          per_page: pageResult.perPage,
          total: pageResult.total,
          next_page_url: pageResult.nextPageUrl,
          prev_page_url: pageResult.previousPageUrl,
        });
        setUnreadCount(Number(unreadData) || 0);
      })
      .catch((requestError) => {
        if (
          !isActive ||
          requestId !== requestSequence.current ||
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(requestError.message || "Failed to load notifications.");
        setLoadFailed(true);
      })
      .finally(() => {
        if (isActive && requestId === requestSequence.current) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [page, retryKey]);

  function changePage(nextPage) {
    setLoading(true);
    setError("");
    setLoadFailed(false);
    setNotifications([]);
    setPage(nextPage);
  }

  function handleRetry() {
    setLoading(true);
    setError("");
    setLoadFailed(false);
    setNotifications([]);
    setRetryKey((current) => current + 1);
  }

  async function handleMarkAsRead(notificationId) {
    setMarkingId(notificationId);
    setError("");

    try {
      await markNotificationAsRead(notificationId);
      announceNotificationsChanged();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : notification
        )
      );

      setUnreadCount((currentCount) =>
        Math.max(0, currentCount - 1)
      );
    } catch (err) {
      setError(
        err.message || "Failed to mark notification as read."
      );
    } finally {
      setMarkingId(null);
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setError("");

    try {
      await markAllNotificationsAsRead();
      announceNotificationsChanged();

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          is_read: true,
          read_at:
            notification.read_at || new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      setError(
        err.message || "Failed to mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <CitizenLayout title="Notifications">
      <section className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-16 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
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
          </div>

          {loading ? (
            <Skeleton className="h-11 w-52 rounded-xl" />
          ) : (
            <div className="glass inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600">
              <BellIcon className="h-5 w-5 text-emerald-700" />

              {unreadCount === 0
                ? "No unread notifications"
                : `${unreadCount} unread notification${
                    unreadCount === 1 ? "" : "s"
                  }`}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{error}</p>

            {!loading && (
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <section className="glass overflow-hidden rounded-2xl">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">
                Recent Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Updates related to your submitted complaints
              </p>
            </div>

            {!loading &&
              notifications.length > 0 &&
              unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll || markingId !== null}
                  className="w-fit rounded-xl px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {markingAll
                    ? "Marking..."
                    : "Mark all as read"}
                </button>
              )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div role="status" className="divide-y divide-slate-100">
              <span className="sr-only">
                Loading notifications...
              </span>

              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="flex items-start gap-4 px-5 py-4 sm:px-6"
                >
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />

                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-56 max-w-full rounded" />
                    <Skeleton className="h-3 w-full max-w-md rounded" />
                  </div>

                  <Skeleton className="h-3 w-14 shrink-0 rounded" />
                </div>
              ))}
            </div>
          ) : loadFailed && notifications.length === 0 ? (
            <p role="status" className="px-5 py-12 text-center text-sm text-slate-600 sm:px-6">
              Notifications could not be loaded. Please try again.
            </p>
          ) : notifications.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-20">
              <NotificationIcon />

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                You're all caught up!
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                You don't have any notifications yet. We'll notify
                you whenever there are updates about your complaints.
              </p>

              <Link
                to="/citizen/complaints"
                className="glass-btn-primary mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                View My Complaints
              </Link>
            </div>
          ) : (
            /* Notifications List */
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const isUnread = !notification.is_read;

                return (
                  <article
                    key={notification.id}
                    className={`flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 ${
                      isUnread
                        ? "glass-soft"
                        : "glass-hover"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isUnread
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <BellIcon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {notification.title || "Complaint Update"}
                          </h3>

                          {isUnread && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              Unread
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {notification.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {formatNotificationDate(
                            notification.created_at
                          )}
                        </p>
                      </div>
                    </div>

                    {isUnread && (
                      <button
                        type="button"
                        onClick={() =>
                          handleMarkAsRead(notification.id)
                        }
                        disabled={
                          markingId === notification.id ||
                          markingAll
                        }
                        className="glass-btn-secondary w-fit shrink-0 rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {markingId === notification.id
                          ? "Marking..."
                          : "Mark as read"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {!loading && pagination && (
          <nav
            aria-label="Notification pages"
            className="glass flex flex-col items-center justify-between gap-3 rounded-2xl px-5 py-4 sm:flex-row"
          >
            <p className="text-sm text-slate-600" aria-live="polite">
              Page {pagination.current_page} of {pagination.last_page}
              <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
              {pagination.total} notification{pagination.total === 1 ? "" : "s"}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={loading || pagination.current_page <= 1}
                className="glass-btn-secondary rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => changePage(Math.min(pagination.last_page, page + 1))}
                disabled={loading || pagination.current_page >= pagination.last_page}
                className="glass-btn-secondary rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </nav>
        )}

        {/* Information */}
        <section className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
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
