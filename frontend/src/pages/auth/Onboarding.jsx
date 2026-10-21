
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { getBarangays, getCitizenProfile, updateCitizenProfile, } from "../../lib/api";
import Logo from "../../assets/System_Logo.png";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

const inputClass =
  "block min-h-12 w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const readOnlyClass =
  "block min-h-12 w-full cursor-default rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 pr-10 text-sm text-slate-700 outline-none placeholder:text-slate-400";

const steps = [
  { label: "Sign in with Google", done: true },
  { label: "Select your barangay", done: false },
  { label: "Start submitting complaints", done: false },
];

function Check({ className = "h-3 w-3" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Field({ id, label, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-slate-800"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({
  id,
  label,
  type = "text",
  value,
  placeholder,
}) {
  return (
    <Field id={id} label={label}>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          readOnly
          className={readOnlyClass}
        />

        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-slate-400">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path
              d="M8 11V8a4 4 0 0 1 8 0v3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
    </Field>
  );
}

function Onboarding() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [barangayId, setBarangayId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOnboardingData() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          navigate("/login", { replace: true });
          return;
        }

        const [barangayList, profileResponse] = await Promise.all([
          getBarangays(),
          getCitizenProfile(),
        ]);

        if (!active) return;

        setUser(session.user);
        setBarangays(barangayList);

        // If the citizen already completed onboarding,
        // send them directly to the dashboard.
        if (
          profileResponse?.profile?.barangay_id &&
          !profileResponse.requires_onboarding
        ) {
          navigate("/citizen/dashboard", { replace: true });
          return;
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load onboarding information."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOnboardingData();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!barangayId || saving) return;

    setError("");
    setSaving(true);

    try {
      await updateCitizenProfile(barangayId);

      navigate("/citizen/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(
        err.message || "Failed to complete your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "";

  const initial = (
    fullName || user?.email || "?"
  )
    .charAt(0)
    .toUpperCase();

  const noBarangays = barangays.length === 0 && !error;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div role="status" className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-emerald-800/20 border-t-emerald-800 motion-reduce:animate-none" />
          <p className="mt-4 text-sm text-slate-600">
            Loading your profile…
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="grid min-h-screen bg-white font-sans text-slate-900 antialiased lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-emerald-950 p-12 text-white lg:flex xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -bottom-32 h-[28rem] w-[28rem] rounded-full border border-white/10"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -bottom-12 h-[18rem] w-[18rem] rounded-full border border-white/10"
        />

        <Link
          to="/"
          className={`relative flex w-fit items-center gap-3 rounded-md focus-visible:ring-white focus-visible:ring-offset-emerald-950 ${focusRing}`}
          aria-label="BantaySerbisyo home"
        >
          <img
            src={Logo}
            alt="BantaySerbisyo Logo"
            className="h-11 w-11 object-contain"
          />

          <span className="text-xl font-bold tracking-tight">
            Bantay
            <span className="font-semibold text-emerald-300">
              Serbisyo
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
            One last step before you start.
          </h2>

          <p className="mt-4 text-base leading-7 text-emerald-100/80">
            Select your barangay of residence to complete your
            citizen account setup.
          </p>

          <ol className="mt-9 space-y-4">
            {steps.map((step, index) => (
              <li
                key={step.label}
                className={`flex items-center gap-3 text-sm leading-6 ${
                  step.done
                    ? "text-emerald-50"
                    : "text-emerald-100/70"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    step.done
                      ? "bg-emerald-400/20 text-emerald-300"
                      : "border border-white/20 text-emerald-100/70"
                  }`}
                >
                  {step.done ? <Check /> : index + 1}
                </span>

                {step.label}
              </li>
            ))}
          </ol>
        </div>

        <p className="relative text-xs text-emerald-100/60">
          Municipality of Tagoloan
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
          <Link
            to="/"
            className={`flex items-center gap-2.5 rounded-md lg:invisible ${focusRing}`}
            aria-label="BantaySerbisyo home"
          >
            <img
              src={Logo}
              alt="BantaySerbisyo Logo"
              className="h-9 w-9 object-contain"
            />

            <span className="text-lg font-bold tracking-tight">
              Bantay
              <span className="font-semibold text-emerald-800">
                Serbisyo
              </span>
            </span>
          </Link>

          <Link
            to="/"
            className={`rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
          >
            Back to home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pt-4 pb-12 sm:px-10">
          <section
            className="w-full max-w-md"
            aria-labelledby="onboarding-title"
          >
            <h1
              id="onboarding-title"
              className="text-3xl font-semibold tracking-tight text-slate-900"
            >
              Complete your profile
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Select your barangay of residence to complete your
              citizen account setup.
            </p>

            {/* Signed-in account */}
            <div className="mt-8 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
                {initial}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {fullName || "Your Google account"}
                </p>

                <p className="truncate text-xs text-slate-500">
                  {user?.email || "Signed in with Google"}
                </p>
              </div>
            </div>

            <div className="my-7 flex items-center gap-4 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              your details
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path
                    d="M12 8v5m0 3.5v.01M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <p className="flex-1">{error}</p>

                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Dismiss message"
                  className={`-mr-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 ${focusRing}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      d="m6 6 12 12M18 6 6 18"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <ReadOnlyField
                id="fullName"
                label="Full name"
                value={fullName}
                placeholder="Not provided"
              />

              <ReadOnlyField
                id="email"
                label="Email address"
                type="email"
                value={user?.email || ""}
                placeholder="Not available"
              />

              <Field id="barangay" label="Barangay *">
                <select
                  id="barangay"
                  value={barangayId}
                  onChange={(event) => {
                    setBarangayId(event.target.value);
                    setError("");
                  }}
                  aria-describedby={
                    noBarangays ? "barangay-help" : undefined
                  }
                  disabled={barangays.length === 0 || saving}
                  required
                  className={inputClass}
                >
                  <option value="">
                    Select your barangay
                  </option>

                  {barangays.map((barangay) => (
                    <option
                      key={barangay.id}
                      value={barangay.id}
                    >
                      {barangay.name}
                    </option>
                  ))}
                </select>

                {noBarangays && (
                  <p
                    id="barangay-help"
                    className="mt-2 flex items-center gap-2 text-sm text-amber-700"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    No barangays are available yet.
                  </p>
                )}
              </Field>

              <button
                type="submit"
                disabled={!barangayId || saving}
                className={`flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-800 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none ${focusRing}`}
              >
                {saving
                  ? "Saving profile..."
                  : "Complete profile"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs leading-6 text-slate-500">
              Your barangay is used only to direct your complaints
              to the right office.
            </p>
          </section>
        </main>

        <footer className="px-6 py-6 text-center text-xs text-slate-500 sm:px-10">
          © {new Date().getFullYear()} BantaySerbisyo ·
          Municipality of Tagoloan
        </footer>
      </div>
    </div>
  );
}

export default Onboarding;
