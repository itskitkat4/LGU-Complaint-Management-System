
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getAuthenticatedProfile } from "../../lib/api";
import AdminLayout from "../../layouts/AdminLayout";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

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
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}

function StatCard({ label, value, description, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon name={icon} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAdmin() {
      try {
        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.access_token) {
          navigate("/login", { replace: true });
          return;
        }

        const response = await getAuthenticatedProfile();
        const adminProfile = response?.profile ?? response;

        if (!adminProfile) {
          throw new Error("Administrator profile could not be loaded.");
        }

        if (adminProfile.role !== "System Administrator") {
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
          return;
        }

        if (active) setProfile(adminProfile);
      } catch (err) {
        if (active) setError(err.message || "Unable to load administrator profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAdmin();
    return () => { active = false; };
  }, [navigate]);

  async function handleLogout() {
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message || "Unable to sign out.");
      return;
    }

    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div role="status" className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-3 text-sm text-slate-500">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
          <p className="font-semibold text-red-700">Unable to load admin portal</p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button onClick={handleLogout} className={`mt-4 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white ${focusRing}`}>
            Return to Login
          </button>
        </div>
      </div>
    );
  }


  return (
    <AdminLayout title="Overview" profile={profile} onLogout={handleLogout}>
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section>
        <p className="text-sm font-medium text-emerald-700">Administration Portal</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Welcome to BantaySerbisyo!
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Manage system users, organizational information, and administrative activities in BantaySerbisyo.
        </p>
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">System Overview</h3>
          <p className="mt-1 text-sm text-slate-500">Summary of registered system information.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Users" value="—" description="Registered system accounts" icon="users" />
          <StatCard label="Total Complaints" value="—" description="Complaints recorded in the system" icon="grid" />
          <StatCard label="Departments" value="—" description="Registered LGU departments" icon="building" />
          <StatCard label="Barangays" value="—" description="Registered barangays" icon="map" />
        </div>
        <p className="mt-3 text-xs text-slate-400">Statistics will be connected to the backend.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="System Activity Overview" description="Monitor system-wide administrative activities.">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Icon name="chart" className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-800">No overview data available</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">System statistics and activity summaries will appear here once the dashboard is connected to the backend.</p>
            </div>
          </Panel>

          <Panel title="Recent System Activities" description="Review recent actions performed within the system.">
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Icon name="activity" className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No activity records available</p>
              <p className="mt-1 text-xs text-slate-500">Activity logs will appear here once connected.</p>
            </div>
          </Panel>
        </div>

          <Panel title="Administrator Account" description="Your currently signed-in account.">
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Full name</p>
                <p className="mt-1 font-medium text-slate-800">{profile?.full_name || profile?.name || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="mt-1 break-all font-medium text-slate-800">{profile?.email || "Not available"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="mt-1 font-medium text-slate-800">System Administrator</p>
              </div>
            </div>
          </Panel>
        </div>
    </AdminLayout>
  );
}
