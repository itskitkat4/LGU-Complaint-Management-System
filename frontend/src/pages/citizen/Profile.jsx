
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getCitizenProfile, getBarangays } from "../../lib/api";
import CitizenLayout from "../../layouts/CitizenLayout";

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View your personal information and account details.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">
              Loading your profile...
            </p>
          </div>
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
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Google profile"
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 rounded-full border-4 border-gray-100 object-cover"
                    onError={() => setAvatar("")}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
                    {initials}
                  </div>
                )}

                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-gray-900">
                    {profile?.full_name || "Citizen"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {profile?.email || "No email available"}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Citizen Account
                  </span>
                </div>
              </div>
            </section>

            {/* Personal Information */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-5">
                <h3 className="font-bold text-gray-900">
                  Personal Information
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your information associated with your BantaySerbisyo account.
                </p>
              </div>

              <div className="grid gap-6 p-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Full Name
                  </label>
                  <p className="mt-2 font-medium text-gray-900">
                    {profile?.full_name || "Not available"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email Address
                  </label>
                  <p className="mt-2 break-all font-medium text-gray-900">
                    {profile?.email || "Not available"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Account Role
                  </label>
                  <p className="mt-2 font-medium capitalize text-gray-900">
                    {profile?.role || "Citizen"}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Barangay
                  </label>
                  <p className="mt-2 font-medium text-gray-900">
                    {barangayName}
                  </p>
                </div>
              </div>
            </section>

            {/* Account Information */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-gray-900">
                Account Information
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
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
