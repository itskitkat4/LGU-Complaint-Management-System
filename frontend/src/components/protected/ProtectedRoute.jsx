import { useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Skeleton({ className = "" }) {
    return (
        <div
            className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
        />
    );
}

function ProtectedRoute({ allowedRoles = [] }) {
    const { user, profile, loading, profileError, refreshProfile } = useAuth();
    const retryInFlight = useRef(false);
    const [retrying, setRetrying] = useState(false);

    const handleRetry = async () => {
        if (retryInFlight.current) {
            return;
        }

        retryInFlight.current = true;
        setRetrying(true);

        try {
            await refreshProfile();
        } catch {
            // AuthContext keeps the session and exposes the profile retrieval error.
        } finally {
            retryInFlight.current = false;
            setRetrying(false);
        }
    };

    if (loading) {
        return (
            <div
                role="status"
                className="min-h-screen bg-slate-50"
            >
                <span className="sr-only">
                    Verifying your account...
                </span>

                <div aria-hidden="true" className="flex min-h-screen">
                    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <Skeleton className="h-5 w-32 rounded" />
                        </div>

                        <div className="mt-8 space-y-3">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3"
                                >
                                    <Skeleton className="h-5 w-5 rounded" />
                                    <Skeleton className="h-4 w-32 rounded" />
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                            <Skeleton className="h-5 w-40 rounded" />

                            <div className="flex items-center gap-3">
                                <Skeleton className="hidden h-4 w-28 rounded sm:block" />
                                <Skeleton className="h-9 w-9 rounded-full" />
                            </div>
                        </div>

                        <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
                            <div>
                                <Skeleton className="h-8 w-64 max-w-full rounded" />
                                <Skeleton className="mt-3 h-4 w-full max-w-md rounded" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-slate-200 bg-white p-5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <Skeleton className="h-4 w-28 rounded" />
                                                <Skeleton className="mt-3 h-9 w-14 rounded" />
                                            </div>

                                            <Skeleton className="h-11 w-11 rounded-xl" />
                                        </div>

                                        <Skeleton className="mt-4 h-3 w-40 rounded" />
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <Skeleton className="h-5 w-44 rounded" />
                                <Skeleton className="mt-2 h-4 w-64 max-w-full rounded" />
                                <Skeleton className="mt-5 h-40 w-full rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (profileError || !profile || profile.id !== user.id) {
        const profileIsMissing = profileError === "missing";
        const profileIsInactive = profileError === "inactive";

        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
                <section
                    role="alert"
                    aria-labelledby="profile-load-error-title"
                    aria-describedby="profile-load-error-message"
                    className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700" aria-hidden="true">
                        <span className="text-xl font-semibold">!</span>
                    </div>
                    <h1 id="profile-load-error-title" className="text-xl font-semibold text-slate-900">
                        {profileIsInactive
                            ? "Account access is inactive"
                            : profileIsMissing
                                ? "Account profile not found"
                                : "We couldn't load your profile"}
                    </h1>
                    <p id="profile-load-error-message" className="mt-2 text-sm leading-6 text-slate-600">
                        {profileIsInactive
                            ? "Your account is signed in, but an administrator has deactivated it. Contact your System Administrator if you think this is a mistake."
                            : profileIsMissing
                                ? "Your session is still active, but we couldn't find an account profile. Please try again or contact support."
                                : "We couldn't load your account profile. Your session is still active. Please try again."}
                    </p>
                    <button
                        type="button"
                        onClick={handleRetry}
                        disabled={retrying}
                        aria-busy={retrying}
                        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                    >
                        Retry
                    </button>
                </section>
            </main>
        );
    }

    if (!allowedRoles.includes(profile.role)) {
        const roleDashboard = {
            citizen: "/citizen/dashboard",
            "System Administrator": "/admin/dashboard",
            "LGU-Staff": "/staff/dashboard",
            Barangay_Head: "/barangay/dashboard",
            Department_Head: "/department/dashboard",
            Department_Personnel: "/personnel/dashboard",
        };

        return (
            <Navigate
                to={roleDashboard[profile.role] || "/login"}
                replace
            />
        );
    }

    return <Outlet />;
}

export default ProtectedRoute;
