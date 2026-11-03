
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getCitizenProfile } from "../../lib/api";
import CitizenLayout, { Icon, Panel, focusRing } from "../../layouts/CitizenLayout";

function StatCard({ label, value, description, icon, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
          <Icon name={icon} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.access_token) {
          navigate("/login", { replace: true });
          return;
        }

        const result = await getCitizenProfile();

        if (!result?.profile) {
          throw new Error("Your citizen profile could not be loaded.");
        }

        if (result.profile.role !== "citizen") {
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
          return;
        }

        if (active) setProfile(result.profile);
      } catch (err) {
        if (active) setError(err.message || "Unable to load your dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => { active = false; };
  }, [navigate]);

  async function handleLogout() {
    setError("");
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
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-800/20 border-t-emerald-800" />
          <p className="mt-4 text-sm text-slate-600">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.full_name || profile?.email?.split("@")[0] || "Citizen";
  const firstName = displayName.split(" ")[0];

  return (
    <CitizenLayout title="Dashboard" profile={profile} onLogout={handleLogout}>
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={`font-semibold underline ${focusRing}`}>Retry</button>
        </div>
      )}

      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, {firstName}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Report community concerns and keep track of your complaints in one place.
          </p>
        </div>
        <Link to="/citizen/complaints/new" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 lg:hidden ${focusRing}`}>
          <Icon name="plus" /> Submit a complaint
        </Link>
      </section>

      <section>
        <h2 className="sr-only">Complaint overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total complaints" value="—" description="All your submissions" icon="file" tone="bg-slate-100 text-slate-700" />
          <StatCard label="Pending review" value="—" description="Awaiting initial assessment" icon="clock" tone="bg-amber-50 text-amber-700" />
          <StatCard label="In progress" value="—" description="Currently being handled" icon="progress" tone="bg-sky-50 text-sky-700" />
          <StatCard label="Resolved" value="—" description="Marked as resolved" icon="check" tone="bg-emerald-50 text-emerald-700" />
        </div>
        <p className="mt-3 text-xs text-slate-500">Complaint statistics will appear when the complaints API is connected.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <Panel title="Recent complaints" description="The latest updates on your reports."
          action={<Link to="/citizen/complaints" className={`inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}>View all <Icon name="arrow" className="h-4 w-4" /></Link>}>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
            <Icon name="file" className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-4 text-sm font-semibold">Your complaints will appear here</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Once the complaints API is connected, you can view your submissions and follow their status here.</p>
            <Link to="/citizen/complaints/new" className={`mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 ${focusRing}`}>
              <Icon name="plus" className="h-4 w-4" /> Submit your first complaint
            </Link>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Quick actions" description="Common tasks for your account.">
            <div className="-my-2 divide-y divide-slate-100">
              {[
                { to: "/citizen/complaints/new", icon: "plus", title: "Submit a complaint", text: "Report a community concern" },
                { to: "/citizen/complaints", icon: "file", title: "Track my complaints", text: "Review status and updates" },
                { to: "/citizen/notifications", icon: "bell", title: "View notifications", text: "Check your latest updates" },
                { to: "/citizen/feedback", icon: "message", title: "Submit feedback", text: "Share your experience" },
              ].map(action => (
                <Link key={action.to} to={action.to} className={`group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3.5 hover:bg-slate-50 ${focusRing}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800"><Icon name={action.icon} /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{action.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{action.text}</span>
                  </span>
                  <Icon name="arrow" className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Account information" description="Your signed-in account.">
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Full name</dt><dd className="text-right font-medium">{profile?.full_name || "Not provided"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd className="break-all text-right font-medium">{profile?.email || "Not available"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Role</dt><dd className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Citizen</dd></div>
            </dl>
          </Panel>
        </div>
      </div>
    </CitizenLayout>
  );
}
