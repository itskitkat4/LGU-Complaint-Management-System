import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getCitizenProfile, getBarangays } from "../../lib/api";
import CitizenLayout from "../../layouts/CitizenLayout";
import { ContentSkeleton } from "../../components/Skeletons";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const [profileResult, barangayResult, userResult] =
        await Promise.all([
          getCitizenProfile(),
          getBarangays(),
          supabase.auth.getUser(),
        ]);

      setProfile(profileResult.profile);
      setBarangays(barangayResult);

      const metadata = userResult.data?.user?.user_metadata || {};

      setAvatar(
        metadata.avatar_url ||
        metadata.picture ||
        ""
      );
    } catch (err) {
      setError(err.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }

  const barangayName =
    barangays.find((barangay) => barangay.id === profile?.barangay_id)
      ?.name || "Not yet selected";

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase()
    : "C";

  return (
    <CitizenLayout title="My Profile">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Page Heading */}
        <div className="flex items-start gap-3">
          <span className="mt-1 h-12 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View your personal information and account details.
            </p>
          </div>
        </div>

        {loading ? (
          <ContentSkeleton label="Loading your profile" variant="form" rows={5} />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={loadProfile}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <section className="glass relative overflow-hidden rounded-3xl p-6">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />

              <div className="relative flex flex-col items-center gap-4 sm:flex-row">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Google profile"
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
                    onError={() => setAvatar("")}
                  />
                ) : (
                  <div className="glass-icon flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold">
                    {initials}
                  </div>
                )}

                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-slate-900">
                    {profile?.full_name || "Citizen"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {profile?.email || "No email available"}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Citizen Account
                  </span>
                </div>
              </div>
            </section>

            {/* Personal Information */}
            <section className="glass overflow-hidden rounded-2xl">
              <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5">
                <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-slate-900">
                    Personal Information
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your information associated with your BantaySerbisyo account.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 p-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Full Name
                  </label>
                  <p className="mt-2 font-medium text-slate-900">
                    {profile?.full_name || "Not available"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email Address
                  </label>
                  <p className="mt-2 break-all font-medium text-slate-900">
                    {profile?.email || "Not available"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Account Role
                  </label>
                  <p className="mt-2 font-medium capitalize text-slate-900">
                    {profile?.role || "Citizen"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Barangay
                  </label>
                  <p className="mt-2 font-medium text-slate-900">
                    {barangayName}
                  </p>
                </div>
              </div>
            </section>

            {/* Account Information */}
            <section className="glass rounded-2xl p-6">
              <h3 className="font-bold text-slate-900">
                Account Information
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your account is authenticated through Google.
                Your name, email address, and profile picture are
                associated with your Google account.
              </p>
            </section>
          </>
        )}
      </div>
    </CitizenLayout>
  );
}
