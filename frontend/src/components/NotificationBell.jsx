import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  getCitizenNotificationsPage,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../lib/api";
import { useAuth } from "../context/AuthContext";

function BellIcon({ className = "h-5 w-5" }) {
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
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
      />
    </svg>
  );
}

function NotificationTypeIcon({ type }) {
  const paths = {
    complaint_submitted: <><path d="M8 3h7l4 4v14H5V3z" /><path d="M14 3v5h5M8 13h8M8 17h8" /></>,
    complaint_assigned: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M18 8v6M15 11h6" /></>,
    complaint_status_updated: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9A7 7 0 0 1 17 6l3 6M4 12l3 6a7 7 0 0 0 11.5-3" /></>,
    complaint_resolved: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    resolution_approved: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    resolution_returned: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5" /><path d="M4 4v4.5h4.5M12 8v4l3 2" /></>,
    resolution_submitted: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 14v5h14v-5" /></>,
  };

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {paths[type] || <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />}
      </svg>
    </span>
  );
}

function formatNotificationDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getComplaintDestination(notification, role) {
  const complaintId = notification.complaint_id;
  if (!complaintId) return null;

  const complaintRoutes = {
    citizen: `/citizen/complaints/${complaintId}`,
    "LGU-Staff": `/staff/complaints/${complaintId}`,
    Barangay_Head: "/barangay/complaints",
    Department_Head: "/department/monitoring",
    Department_Personnel: `/personnel/assignments/${complaintId}`,
    "System Administrator": "/admin/complaints",
  };

  return complaintRoutes[role] || null;
}

export default function NotificationBell() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const unreadRequestRef = useRef(null);
  const notificationsRequestRef = useRef(null);
  const loadMoreRequestRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const refreshUnreadCount = useCallback(() => {
    if (unreadRequestRef.current) return unreadRequestRef.current;

    const request = getUnreadNotificationCount()
      .then((count) => {
        const normalizedCount = Number(count) || 0;
        setUnreadCount(normalizedCount);
        return normalizedCount;
      })
      .finally(() => {
        if (unreadRequestRef.current === request) {
          unreadRequestRef.current = null;
        }
      });

    unreadRequestRef.current = request;
    return request;
  }, []);

  const loadNotifications = useCallback(async () => {
    if (notificationsRequestRef.current) return notificationsRequestRef.current;

    setLoading(true);
    setError("");

    const request = Promise.all([
      getCitizenNotificationsPage(1),
      refreshUnreadCount(),
    ])
      .then(([page]) => {
        setNotifications(page.notifications);
        setCurrentPage(page.currentPage);
        setHasMore(page.hasMore);
      })
      .catch((requestError) => {
        setError(requestError.message || "Unable to load notifications.");
      })
      .finally(() => {
        setLoading(false);
        if (notificationsRequestRef.current === request) {
          notificationsRequestRef.current = null;
        }
      });

    notificationsRequestRef.current = request;
    return request;
  }, [refreshUnreadCount]);

  async function loadMoreNotifications() {
    if (!hasMore || loadMoreRequestRef.current) return;

    const nextPage = currentPage + 1;
    const request = getCitizenNotificationsPage(nextPage);
    loadMoreRequestRef.current = request;
    setLoadingMore(true);
    setError("");

    try {
      const page = await request;
      setNotifications((current) => {
        const existingIds = new Set(current.map((notification) => notification.id));
        return [
          ...current,
          ...page.notifications.filter((notification) => !existingIds.has(notification.id)),
        ];
      });
      setCurrentPage(page.currentPage);
      setHasMore(page.hasMore);
    } catch (requestError) {
      setError(requestError.message || "Unable to load previous notifications.");
    } finally {
      setLoadingMore(false);
      if (loadMoreRequestRef.current === request) {
        loadMoreRequestRef.current = null;
      }
    }
  }

  useEffect(() => {
    let active = true;

    refreshUnreadCount().catch((requestError) => {
      if (active) {
        setError(requestError.message || "Unable to load unread notifications.");
      }
    });

    return () => {
      active = false;
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    function handleNotificationsChanged() {
      refreshUnreadCount().catch((requestError) => {
        setError(requestError.message || "Unable to refresh unread notifications.");
      });
    }

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function toggleDropdown() {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    if (nextIsOpen) void loadNotifications();
  }

  async function handleNotificationClick(notification) {
    if (markingAll || markingId) return;

    if (!notification.is_read) {
      setMarkingId(notification.id);
      setError("");

      try {
        await markNotificationAsRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch (requestError) {
        setError(requestError.message || "Unable to mark notification as read.");
        setMarkingId(null);
        return;
      }

      setMarkingId(null);
    }

    setIsOpen(false);
    const destination = getComplaintDestination(notification, role);
    if (destination) navigate(destination);
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || markingAll || markingId) return;

    setMarkingAll(true);
    setError("");

    try {
      await markAllNotificationsAsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at || readAt,
        }))
      );
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.message || "Unable to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") return !notification.is_read;
    if (filter === "read") return notification.is_read;
    return true;
  });

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
        aria-controls="notification-dropdown"
        className="glass relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:text-emerald-200"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <>
            <span className="absolute left-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-5 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        )}
      </button>

      {isOpen && (
        <section
          id="notification-dropdown"
          aria-label="Notifications"
          className="fixed inset-x-3 top-16 z-50 mx-auto flex max-h-[calc(100vh-5rem)] w-auto max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mx-0 sm:mt-3 sm:max-h-[min(36rem,calc(100vh-6rem))] sm:w-[min(26rem,calc(100vw-1.5rem))] dark:border-slate-700 dark:bg-slate-900"
        >
          <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Notifications</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markingAll || markingId !== null}
              className="mt-0.5 shrink-0 text-xs font-semibold text-emerald-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300"
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          </header>

          <div className="flex gap-1 border-b border-slate-100 px-3 py-2 dark:border-slate-800" role="tablist" aria-label="Filter notifications">
            {[
              { value: "all", label: "All" },
              { value: "unread", label: "Unread" },
              { value: "read", label: "Read" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === option.value
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {error && (
            <div role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {error}
              {!loading && (
                <button type="button" onClick={() => void loadNotifications()} className="ml-2 font-semibold underline">
                  Retry
                </button>
              )}
            </div>
          )}

          <div className="min-h-24 flex-1 overflow-y-auto">
            {loading ? (
              <p role="status" className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Loading notifications...
              </p>
            ) : filteredNotifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {notifications.length === 0
                  ? "No notifications yet."
                  : `No ${filter} notifications in the loaded history.`}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNotifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      disabled={markingAll || markingId === notification.id}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 disabled:cursor-wait dark:hover:bg-slate-800/70 ${
                        notification.is_read ? "" : "bg-emerald-50/60 dark:bg-emerald-950/20"
                      }`}
                    >
                      <NotificationTypeIcon type={notification.type} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {notification.title || "Complaint update"}
                          </span>
                          {!notification.is_read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-label="Unread" />
                          )}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                          {notification.message}
                        </span>
                        <time
                          dateTime={notification.created_at || undefined}
                          className="mt-1.5 block text-[11px] text-slate-400 dark:text-slate-500"
                        >
                          {formatNotificationDate(notification.created_at)}
                        </time>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!loading && hasMore && (
              <button
                type="button"
                onClick={() => void loadMoreNotifications()}
                disabled={loadingMore}
                className="w-full px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                {loadingMore ? "Loading previous notifications..." : "Load more notifications"}
              </button>
            )}
            {!loading && !hasMore && notifications.length > 0 && (
              <p className="px-4 py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                You’re all caught up.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
