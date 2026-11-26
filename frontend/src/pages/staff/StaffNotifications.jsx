import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import { ContentSkeleton } from "../../components/Skeletons";
import {
  announceNotificationsChanged,
  getCitizenNotifications,
  markNotificationAsRead,
} from "../../lib/api";

export default function StaffNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getCitizenNotifications()
      .then((items) => {
        if (active) setNotifications(items);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "Unable to load notifications.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function markAsRead(notification) {
    if (notification.is_read) return;

    try {
      await markNotificationAsRead(notification.id);
      announceNotificationsChanged();
      setNotifications((current) => current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      ));
    } catch (requestError) {
      setError(requestError.message || "Unable to mark notification as read.");
    }
  }

  const content = (
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start gap-3">
          <span className="mt-1 h-12 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Staff notifications
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Follow up on citizen reports and other complaint updates.
            </p>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <ContentSkeleton label="Loading notifications" variant="list" rows={4} />
        ) : notifications.length === 0 ? (
          <p className="glass rounded-2xl p-6 text-sm text-slate-600">
            No notifications yet.
          </p>
        ) : (
          <ul className="glass divide-y divide-slate-200 overflow-hidden rounded-2xl">
            {notifications.map((notification) => (
              <li key={notification.id} className="glass-hover flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {notification.title || "Complaint update"}
                    {!notification.is_read && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        New
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {notification.message}
                  </p>
                  {notification.complaint_id && (
                    <Link
                      to={`/staff/complaints/${notification.complaint_id}`}
                      onClick={() => void markAsRead(notification)}
                      className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline"
                    >
                      Open complaint
                    </Link>
                  )}
                </div>
                {!notification.is_read && (
                  <button
                    type="button"
                    onClick={() => void markAsRead(notification)}
                    className="text-sm font-medium text-slate-600 underline"
                  >
                    Mark as read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
  );

  return <StaffLayout title="Staff notifications" role="LGU Staff">{content}</StaffLayout>;
}
