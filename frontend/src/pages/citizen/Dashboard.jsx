import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import {
    getCitizenComplaints,
} from "../../lib/api";

import CitizenLayout from "../../layouts/CitizenLayout";
import { useAuth } from "../../context/AuthContext";

import {
    Icon,
    Panel,
    focusRing,
} from "../../layouts/citizenLayoutUtils";

import { StatusBadge } from "../../components/ui";

function Skeleton({ className = "" }) {
    return (
        <div
            className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
        />
    );
}




function StatCard({ label, value, description, icon, tone }) {
    return (
        <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-4">
                <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone}`}
                >
                    <Icon name={icon} />
                </span>

                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-600">
                        {label}
                    </p>

                    <p className="mt-1 text-3xl font-semibold text-slate-900">
                        {value}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

function formatDate(date) {
    if (!date) {
        return "Date unavailable";
    }

    return new Date(date).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatStatus(status) {
    if (!status) {
        return "Unknown";
    }

    return status
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isComplaintRecord(complaint) {
    if (
        typeof complaint !== "object" ||
        complaint === null ||
        Array.isArray(complaint) ||
        typeof complaint.id !== "string" ||
        complaint.id.trim() === ""
    ) {
        return false;
    }

    if (
        (complaint.title !== undefined && typeof complaint.title !== "string") ||
        (complaint.status !== undefined && typeof complaint.status !== "string") ||
        (complaint.created_at !== undefined &&
            complaint.created_at !== null &&
            typeof complaint.created_at !== "string")
    ) {
        return false;
    }

    const category = complaint.category;
    return (
        category === undefined ||
        category === null ||
        (typeof category === "object" &&
            !Array.isArray(category) &&
            (category.name === undefined || typeof category.name === "string"))
    );
}

export default function CitizenDashboard() {
    const navigate = useNavigate();
    const { user, profile: authProfile } = useAuth();
    const userId = user?.id;
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadDashboard = useCallback(async () => {
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (!session?.access_token || !session.user?.id) {
            navigate("/login", { replace: true });
            throw new Error("Please sign in first.");
        }

        if (
            !userId ||
            session.user.id !== userId ||
            authProfile?.id !== userId ||
            authProfile.role !== "citizen"
        ) {
            throw new Error("Your authenticated citizen profile is not ready.");
        }

        const complaintResult = await getCitizenComplaints();
        const expectedStatistics = [
            "total",
            "pre_assignment",
            "in_progress",
            "resolved",
        ];
        const resultStatistics = complaintResult?.statistics;

        if (
            !Array.isArray(complaintResult?.data) ||
            !complaintResult.pagination ||
            !Number.isInteger(complaintResult.pagination.total) ||
            !resultStatistics ||
            !expectedStatistics.every((key) =>
                Number.isInteger(resultStatistics[key]) &&
                resultStatistics[key] >= 0
            ) ||
            resultStatistics.total !== complaintResult.pagination.total
        ) {
            throw new Error("Your complaint dashboard response is incomplete or invalid.");
        }

        if (!complaintResult.data.every(isComplaintRecord)) {
            throw new Error("Your complaint dashboard response contains invalid complaint records.");
        }

        return {
            profile: authProfile,
            complaints: complaintResult.data,
            statistics: resultStatistics,
        };
    }, [navigate, userId, authProfile]);
    useEffect(() => {
        let active = true;

        loadDashboard()
            .then((result) => {
                if (active) {
                    setDashboard(result);
                    setError(null);
                }
            })
            .catch((loadError) => {
                if (active) {
                    setError(loadError);
                }
            })
            .finally(() => {
                if (active) {
                    setIsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [loadDashboard]);

    const profile = dashboard?.profile ?? authProfile;
    const complaints = dashboard?.complaints || [];
    const statistics = dashboard?.statistics;

    if (isLoading) {
        return (
            <div
                role="status"
                className="app-bg min-h-screen"
            >
                <span className="sr-only">
                    Loading dashboard...
                </span>

                <div aria-hidden="true">
                    <div className="glass mx-4 mt-4 flex items-center justify-between rounded-2xl px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-lg" />
                            <Skeleton className="h-5 w-36 rounded" />
                        </div>

                        <Skeleton className="h-9 w-9 rounded-full" />
                    </div>

                    <div className="mx-auto max-w-7xl space-y-6 p-6">
                        <div className="glass rounded-3xl p-6 sm:p-8">
                            <Skeleton className="h-8 w-72 max-w-full rounded" />
                            <Skeleton className="mt-3 h-4 w-full max-w-xl rounded" />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="glass rounded-2xl p-5"
                                >
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />

                                        <div>
                                            <Skeleton className="h-4 w-28 rounded" />
                                            <Skeleton className="mt-3 h-9 w-14 rounded" />
                                            <Skeleton className="mt-3 h-3 w-32 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
                            <div className="glass rounded-2xl p-5">
                                <Skeleton className="h-5 w-44 rounded" />
                                <Skeleton className="mt-2 h-4 w-60 max-w-full rounded" />
                                <Skeleton className="mt-5 h-48 w-full rounded-xl" />
                            </div>

                            <div className="space-y-6">
                                <div className="glass rounded-2xl p-5">
                                    <Skeleton className="h-5 w-32 rounded" />
                                    <Skeleton className="mt-2 h-4 w-48 rounded" />

                                    <div className="mt-5 space-y-4">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3"
                                            >
                                                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />

                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-36 rounded" />
                                                    <Skeleton className="h-3 w-28 rounded" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="glass rounded-2xl p-5">
                                    <Skeleton className="h-5 w-40 rounded" />
                                    <Skeleton className="mt-2 h-4 w-44 rounded" />

                                    <div className="mt-5 space-y-4">
                                        {Array.from({ length: 3 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className="flex justify-between gap-4"
                                            >
                                                <Skeleton className="h-4 w-20 rounded" />
                                                <Skeleton className="h-4 w-36 rounded" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const displayName =
        profile?.full_name ||
        profile?.email?.split("@")[0] ||
        "Citizen";

    const firstName = displayName.split(" ")[0];

    return (
        <CitizenLayout title="Dashboard" profile={profile}>
            <section className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />

                <div className="relative">
                    <p className="text-sm font-medium text-emerald-700">
                        Citizen Portal
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                        Welcome back, {firstName}
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                        Report community concerns and keep track of your
                        complaints in one place.
                    </p>

                    <span className="mt-3 block h-1 w-20 rounded-full bg-emerald-500" aria-hidden="true" />
                </div>
            </section>

            {error && (
                <div
                    role="alert"
                    className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                    <p>{error.message}</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className={`font-semibold underline ${focusRing}`}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section>
                <h2 className="sr-only">Complaint overview</h2>

                {statistics ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Total complaints"
                            value={statistics.total}
                            description="All your submissions"
                            icon="file"
                            tone="bg-slate-100 text-slate-700"
                        />

                        <StatCard
                            label="Pre-assignment"
                            value={statistics.pre_assignment}
                            description="Submitted, under review, or accepted"
                            icon="clock"
                            tone="bg-amber-50 text-amber-700"
                        />

                        <StatCard
                            label="Assigned / In progress"
                            value={statistics.in_progress}
                            description="Assigned or currently being handled"
                            icon="progress"
                            tone="bg-sky-50 text-sky-700"
                        />

                        <StatCard
                            label="Resolved"
                            value={statistics.resolved}
                            description="Approved by LGU Staff"
                            icon="check"
                            tone="bg-emerald-50 text-emerald-700"
                        />
                    </div>
                ) : (
                    <p role="status" className="glass rounded-xl px-4 py-3 text-sm text-slate-600">
                        Complaint statistics are unavailable.
                    </p>
                )}
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
                <Panel
                    title="Recent complaints"
                    description="The latest updates on your reports."
                    action={
                        <Link
                            to="/citizen/complaints"
                            className={`inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:underline ${focusRing}`}
                        >
                            View all
                            <Icon
                                name="arrow"
                                className="h-4 w-4"
                            />
                        </Link>
                    }
                >
                    {error ? (
                        <p role="status" className="py-8 text-center text-sm text-slate-500">
                            Complaint records are unavailable.
                        </p>
                    ) : complaints.length === 0 ? (
                        <div className="glass-soft rounded-2xl px-5 py-10 text-center">
                            <Icon
                                name="file"
                                className="mx-auto h-8 w-8 text-slate-400"
                            />

                            <h3 className="mt-4 text-sm font-semibold">
                                No complaints yet
                            </h3>

                            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                                Your submitted complaints and their latest
                                status will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {complaints.slice(0, 5).map((complaint) => (
                                <Link
                                    key={complaint.id}
                                    to={`/citizen/complaints/${complaint.id}`}
                                    className={`glass-hover flex items-center justify-between gap-4 rounded-xl px-3 py-4 ${focusRing}`}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-slate-900">
                                            {complaint.title || "Title unavailable"}
                                        </span>

                                        <span className="mt-1 block text-xs text-slate-500">
                                            {complaint.category?.name ||
                                                "Uncategorized"}
                                            {" · "}
                                            {formatDate(complaint.created_at)}
                                        </span>
                                    </span>

                                    <span className="flex shrink-0 items-center gap-2">
                                        <StatusBadge
                                            status={formatStatus(complaint.status)}
                                        />

                                        <Icon
                                            name="arrow"
                                            className="h-4 w-4 text-slate-400"
                                        />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </Panel>

                <div className="space-y-6">
                    <Panel
                        title="Quick actions"
                        description="Common tasks for your account."
                    >
                        <div className="-my-2 divide-y divide-slate-100">
                            {[
                                {
                                    to: "/citizen/complaints/new",
                                    icon: "plus",
                                    title: "Submit a complaint",
                                    text: "Report a community concern",
                                },
                                {
                                    to: "/citizen/complaints",
                                    icon: "file",
                                    title: "Track my complaints",
                                    text: "Review status and updates",
                                },
                                {
                                    to: "/citizen/notifications",
                                    icon: "bell",
                                    title: "View notifications",
                                    text: "Check your latest updates",
                                },
                                {
                                    to: "/citizen/feedback",
                                    icon: "message",
                                    title: "Submit feedback",
                                    text: "Share your experience",
                                },
                            ].map((action) => (
                                <Link
                                    key={action.to}
                                    to={action.to}
                                    className={`glass-hover group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3.5 ${focusRing}`}
                                >
                                    <span className="glass-icon flex h-10 w-10 items-center justify-center rounded-full">
                                        <Icon name={action.icon} />
                                    </span>

                                    <span className="flex-1">
                                        <span className="block text-sm font-semibold">
                                            {action.title}
                                        </span>

                                        <span className="mt-0.5 block text-xs text-slate-500">
                                            {action.text}
                                        </span>
                                    </span>

                                    <Icon
                                        name="arrow"
                                        className="h-4 w-4 text-slate-400"
                                    />
                                </Link>
                            ))}
                        </div>
                    </Panel>

                    <Panel
                        title="Account information"
                        description="Your signed-in account."
                    >
                        <dl className="space-y-4 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">Full name</dt>
                                <dd className="text-right font-medium">
                                    {profile?.full_name || "Not provided"}
                                </dd>
                            </div>

                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">Email</dt>
                                <dd className="break-all text-right font-medium">
                                    {profile?.email || "Not available"}
                                </dd>
                            </div>

                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">Role</dt>
                                <dd className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                    Citizen
                                </dd>
                            </div>
                        </dl>
                    </Panel>
                </div>
            </div>
        </CitizenLayout>
    );
}