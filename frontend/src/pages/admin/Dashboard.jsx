import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getAdminDashboardSummary, getAuthenticatedProfile } from "../../lib/api";
import { confirmAndSignOut } from "../../lib/signOut";
import AdminLayout from "../../layouts/AdminLayout";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-slate-200 ${className}`} />;
}

function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className, fill: "none", stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
    viewBox: "0 0 24 24", "aria-hidden": true,
  };

  const paths = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    building: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 21V9h6v12M7 7h.01M12 7h.01M17 7h.01M7 12h.01M17 12h.01" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    message: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}

function StatCard({ label, value, description, icon, loading = false }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <span className="glass-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <Icon name={icon} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>

          {loading ? (
            <Skeleton className="mt-2 h-9 w-16 rounded" />
          ) : (
            <h3 className="mt-1 text-3xl font-bold text-slate-900">{value}</h3>
          )}
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function isValidSummary(value) {
  return value && ["users", "complaints", "departments", "barangays"].every(
    (key) => Number.isInteger(value[key]) && value[key] >= 0
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="glass rounded-2xl">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const loadAdminDashboard = useCallback(async () => {
    const { data: { session }, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session?.access_token) {
      navigate("/login", { replace: true });
      throw new Error("Please sign in first.");
    }

    const response = await getAuthenticatedProfile();
    const profile = response?.profile ?? response;

    if (!profile) {
      throw new Error("Administrator profile could not be loaded.");
    }


    if (profile.role !== "System Administrator") {
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
      throw new Error("This account is not authorized to access the administrator dashboard.");
    }

    const summary = await getAdminDashboardSummary();
    if (!isValidSummary(summary)) {
      throw new Error("The administrator dashboard summary is incomplete or invalid.");
    }

    return { profile, summary };
  }, [navigate]);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const result = await loadAdminDashboard();
        if (active) {
          setDashboard(result);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to load administrator profile.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [loadAdminDashboard]);

  const profile = dashboard?.profile;
  const summary = dashboard?.summary;

  async function handleLogout() {
    await confirmAndSignOut(navigate);
  }

  if (isLoading) {
    return (
      <div role="status" className="app-bg min-h-screen">
        <span className="sr-only">Loading admin portal...</span>

        <div aria-hidden="true">
          {/* Top bar */}
          <div className="glass mx-4 mt-4 flex items-center justify-between rounded-2xl px-6 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-5 w-36 rounded" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>

          <div className="mx-auto max-w-7xl space-y-6 p-6">
            {/* Welcome */}
            <div className="glass rounded-3xl p-6 sm:p-8">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="mt-3 h-8 w-72 max-w-full rounded" />
              <Skeleton className="mt-3 h-4 w-full max-w-xl rounded" />
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="glass rounded-2xl p-5"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 rounded" />
                      <Skeleton className="mt-3 h-9 w-16 rounded" />
                      <Skeleton className="mt-3 h-3 w-32 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Panels */}
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <div className="glass rounded-2xl p-5">
                  <Skeleton className="h-5 w-52 rounded" />
                  <Skeleton className="mt-2 h-4 w-72 max-w-full rounded" />
                  <Skeleton className="mt-5 h-44 w-full rounded-xl" />
                </div>

                <div className="glass rounded-2xl p-5">
                  <Skeleton className="h-5 w-52 rounded" />
                  <Skeleton className="mt-2 h-4 w-72 max-w-full rounded" />
                  <Skeleton className="mt-5 h-24 w-full rounded-xl" />
                </div>
              </div>

              <div className="glass rounded-2xl p-5">
                <Skeleton className="h-5 w-44 rounded" />
                <Skeleton className="mt-2 h-4 w-48 rounded" />
                <div className="mt-5 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="mt-2 h-4 w-40 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center p-6">
        <div className="glass w-full max-w-md rounded-2xl p-6 text-center">
          <p className="font-semibold text-red-700">Unable to load admin portal</p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button onClick={handleLogout} className={`glass-btn-primary mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold ${focusRing}`}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }


  return (
    <AdminLayout title="Overview" profile={profile}>
      <section className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="relative flex items-center gap-5">
          <span className="glass-icon hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:flex">
            <Icon name="shield" className="h-8 w-8" />
          </span>
          <div>
            <p className="text-sm font-medium text-emerald-700">Administration Portal</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Welcome to BantaySerbisyo!
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage system users, organizational information, and administrative activities in BantaySerbisyo.
            </p>
            <span className="mt-3 block h-1 w-20 rounded-full bg-emerald-500" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">System Overview</h3>
            <p className="mt-1 text-sm text-slate-500">Summary of registered system information.</p>
          </div>
        </div>
        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>

        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Users" value={summary?.users ?? 0} description="Registered system accounts" icon="users" />
          <StatCard label="Total Complaints" value={summary?.complaints ?? 0} description="Complaints recorded in the system" icon="message" />
          <StatCard label="Departments" value={summary?.departments ?? 0} description="Registered LGU departments" icon="building" />
          <StatCard label="Barangays" value={summary?.barangays ?? 0} description="Registered barangays" icon="map" />
        </div>
      </section>

      <div className="grid gap-6">
        <Panel title="Administrator Account" description="Your currently signed-in account.">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="glass-icon flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold">
              {(profile?.full_name || profile?.name || profile?.email || "A").charAt(0).toUpperCase()}
            </span>
            <div className="grid flex-1 gap-5 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Full name</p>
                <p className="mt-1 font-medium text-slate-800">{profile?.full_name || profile?.name || "Not provided"}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="glass-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-700">
                  <Icon name="mail" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="mt-1 break-all font-medium text-slate-800">{profile?.email || "Not available"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="glass-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-emerald-700">
                  <Icon name="shield" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="mt-1 font-medium text-slate-800">System Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </AdminLayout>
  );
}