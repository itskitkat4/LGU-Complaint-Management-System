import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import tagoloanSeal from "../../assets/System_Logo.png";
import { supabase } from "../../lib/supabase";

const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

const inputClass =
    "block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10";

    //*  Password rules (display only) 
const passwordRules = [
    { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
    { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
    { id: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
    {
        id: "special",
        label: "One special character (! @ # $ %)",
        test: (p) => /[^A-Za-z0-9]/.test(p),
    },
];

    //*  Skeleton helper 
function Skeleton({ className = "" }) {
    return (
        <div
            className={`animate-pulse bg-slate-200 motion-reduce:animate-none ${className}`}
        />
    );
}

    //*  Small icons 
function EyeIcon({ off }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {off && <path d="M4 4l16 16" />}
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
    );
}

function LockIcon({ className = "h-6 w-6", strokeWidth = 1.8 }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            aria-hidden="true"
        >
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5M12 16h.01" />
        </svg>
    );
}

function Spinner({ className = "h-4 w-4" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`${className} animate-spin`}
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
            />
            <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}

    //*  Reusable UI pieces 
function Field({ id, label, hint, children }) {
    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label
                    htmlFor={id}
                    className="block text-sm font-medium text-slate-800"
                >
                    {label}
                </label>
                {hint}
            </div>
            {children}
        </div>
    );
}

function PasswordInput({ id, value, onChange, disabled, placeholder, describedBy }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input
                id={id}
                type={visible ? "text" : "password"}
                value={value}
                onChange={onChange}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={disabled}
                aria-describedby={describedBy}
                className={`${inputClass} pr-12 disabled:cursor-not-allowed disabled:bg-slate-100`}
                placeholder={placeholder}
            />

            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                disabled={disabled}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                className={`absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
            >
                <EyeIcon off={visible} />
            </button>
        </div>
    );
}

function StrengthMeter({ password, passed, total }) {
    if (!password) return null;

    let level = 1;
    let label = "Weak";
    let barColor = "bg-red-500";
    let textColor = "text-red-700";

    if (passed === total) {
        level = 4;
        label = "Strong";
        barColor = "bg-emerald-600";
        textColor = "text-emerald-700";
    } else if (passed >= 4) {
        level = 3;
        label = "Good";
        barColor = "bg-lime-500";
        textColor = "text-lime-700";
    } else if (passed >= 3) {
        level = 2;
        label = "Fair";
        barColor = "bg-amber-500";
        textColor = "text-amber-700";
    }

    return (
        <div className="mt-3 flex items-center gap-3" aria-live="polite">
            <div className="flex flex-1 gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                    <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            i <= level ? barColor : "bg-slate-200"
                        }`}
                    />
                ))}
            </div>
            <span className={`w-14 text-right text-xs font-semibold ${textColor}`}>
                {label}
            </span>
        </div>
    );
}

function RuleChecklist({ password }) {
    return (
        <ul
            id="password-rules"
            className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2"
            aria-label="Password requirements"
        >
            {passwordRules.map((rule) => {
                const ok = rule.test(password);

                return (
                    <li
                        key={rule.id}
                        className={`flex items-center gap-2 text-xs leading-5 transition-colors ${
                            ok ? "text-emerald-800" : "text-slate-500"
                        }`}
                    >
                        <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                ok
                                    ? "border-emerald-700 bg-emerald-700 text-white"
                                    : "border-slate-300 bg-white text-transparent"
                            }`}
                            aria-hidden="true"
                        >
                            <CheckIcon />
                        </span>
                        <span>
                            {rule.label}
                            <span className="sr-only">
                                {ok ? " (met)" : " (not met)"}
                            </span>
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

function Brand({ light = false }) {
    return (
        <>
            <img
                src={tagoloanSeal}
                alt="Official Seal of Tagoloan"
                className={light ? "h-11 w-11 object-contain" : "h-9 w-9 object-contain"}
            />

            <span
                className={`font-bold tracking-tight ${
                    light ? "text-xl" : "text-lg"
                }`}
            >
                Bantay
                <span
                    className={`font-semibold ${
                        light ? "text-emerald-300" : "text-emerald-800"
                    }`}
                >
                    Serbisyo
                </span>
            </span>
        </>
    );
}

//*  Page shell shared by every state 
function AuthShell({ panelText, panelExtra, children }) {
    return (
        <div className="grid min-h-screen bg-white font-sans text-slate-900 antialiased lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            {/* LEFT BRANDING PANEL */}
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-emerald-950 p-12 text-white lg:flex xl:p-16">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-40 -left-40 h-[26rem] w-[26rem] rounded-full bg-emerald-800/30 blur-3xl"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-32 -bottom-32 h-[28rem] w-[28rem] rounded-full border border-white/10"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -bottom-12 h-[18rem] w-[18rem] rounded-full border border-white/10"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-10 bottom-10 h-[8rem] w-[8rem] rounded-full border border-white/10"
                />

                <Link
                    to="/"
                    className={`relative flex w-fit items-center gap-3 rounded-md focus-visible:ring-white focus-visible:ring-offset-emerald-950 ${focusRing}`}
                    aria-label="BantaySerbisyo home"
                >
                    <Brand light />
                </Link>

                <div className="relative max-w-md">
                    <h2 className="text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
                        Your concerns, handled in the open.
                    </h2>

                    <p className="mt-4 text-base leading-7 text-emerald-100/80">
                        {panelText}
                    </p>

                    {panelExtra}
                </div>

                <p className="relative text-xs text-emerald-100/60">
                    Municipality of Tagoloan
                </p>
            </aside>

            {/* RIGHT CONTENT AREA */}
            <div className="flex min-h-screen flex-col bg-slate-50/40">
                <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
                    <Link
                        to="/"
                        className={`flex items-center gap-2.5 rounded-md lg:invisible ${focusRing}`}
                        aria-label="BantaySerbisyo home"
                    >
                        <Brand />
                    </Link>

                </header>

                <main className="flex flex-1 items-center justify-center px-6 pt-4 pb-12 sm:px-10">
                    {children}
                </main>

                <footer className="px-6 py-6 text-center text-xs text-slate-500 sm:px-10">
                    © {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan
                </footer>
            </div>
        </div>
    );
}

//* Left-panel content for the loading + form states 
const formPanelText =
    "Create your password to securely access your BantaySerbisyo staff account.";

const formPanelExtra = (
    <div className="mt-9 flex items-center gap-3 text-sm text-emerald-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
            <LockIcon className="h-4 w-4" strokeWidth={2} />
        </span>
        Secure staff account setup
    </div>
);

//* Page 
function SetPassword() {
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        async function checkInvitation() {
            const { data, error } = await supabase.auth.getSession();

            if (error || !data.session) {
                setError("Your invitation link is invalid or has expired.");
                setLoading(false);
                return;
            }

            setHasSession(true);
            setLoading(false);
        }

        checkInvitation();
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setSaving(true);

            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) throw error;

            await supabase.auth.signOut();

            navigate("/login", {
                replace: true,
                state: {
                    message: "Password created successfully. You can now log in.",
                },
            });
        } catch (err) {
            setError(err.message || "Failed to set your password.");
        } finally {
            setSaving(false);
        }
    }

    /* Derived values used only for display */
    const passedCount = passwordRules.filter((r) => r.test(password)).length;
    const allRulesMet = passedCount === passwordRules.length;
    const showMatchStatus = confirmPassword.length > 0;
    const passwordsMatch = password === confirmPassword;
    const canSubmit = allRulesMet && passwordsMatch && !saving;

    //* Loading skeleton
    if (loading) {
        return (
            <AuthShell panelText={formPanelText} panelExtra={formPanelExtra}>
                <div
                    role="status"
                    className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                >
                    <span className="sr-only">Verifying invitation...</span>

                    <div aria-hidden="true">
                        {/* Icon + title + subtitle */}
                        <div className="mb-7">
                            <Skeleton className="mb-5 h-12 w-12 rounded-xl" />
                            <Skeleton className="h-9 w-56 max-w-full rounded-md" />
                            <Skeleton className="mt-3 h-4 w-full rounded" />
                            <Skeleton className="mt-2 h-4 w-2/3 rounded" />
                        </div>

                        <div className="space-y-6">
                            {/* New password + strength + rules */}
                            <div>
                                <Skeleton className="mb-2 h-4 w-28 rounded" />
                                <Skeleton className="h-12 w-full rounded-lg" />

                                <div className="mt-3 flex gap-1.5">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton
                                            key={i}
                                            className="h-1.5 flex-1 rounded-full"
                                        />
                                    ))}
                                </div>

                                <div className="mt-4 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                                            <Skeleton className="h-3 w-full max-w-[9rem] rounded" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Confirm password */}
                            <div>
                                <Skeleton className="mb-2 h-4 w-32 rounded" />
                                <Skeleton className="h-12 w-full rounded-lg" />
                            </div>

                            {/* Submit button */}
                            <Skeleton className="h-12 w-full rounded-lg" />
                        </div>

                        <Skeleton className="mx-auto mt-6 h-3 w-4/5 rounded" />
                    </div>
                </div>
            </AuthShell>
        );
    }

    //*  Invalid / expired invitation
    if (!hasSession) {
        return (
            <AuthShell
                panelText="A secure account helps you access BantaySerbisyo  and connect with the Municipality of Tagoloan."
            >
                <section className="w-full max-w-md text-center">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                        <svg
                            viewBox="0 0 24 24"
                            className="h-7 w-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7.5v5.5M12 16.5h.01" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                        Invitation unavailable
                    </h1>

                    <p
                        role="alert"
                        className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
                    >
                        {error}
                    </p>

                    <Link
                        to="/login"
                        className={`mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-800 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900 ${focusRing}`}
                    >
                        Go to Login
                    </Link>
                </section>
            </AuthShell>
        );
    }

    //*  Set password form
    return (
        <AuthShell panelText={formPanelText} panelExtra={formPanelExtra}>
            <section
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
                aria-labelledby="auth-title"
            >
                <div className="mb-7">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                        <LockIcon />
                    </div>

                    <h1
                        id="auth-title"
                        className="text-3xl font-semibold tracking-tight text-slate-900"
                    >
                        Set your password
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Create a password to access your BantaySerbisyo staff
                        account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <div>
                        <Field id="password" label="New password">
                            <PasswordInput
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={saving}
                                placeholder="Enter new password"
                                describedBy="password-rules"
                            />
                        </Field>

                        <StrengthMeter
                            password={password}
                            passed={passedCount}
                            total={passwordRules.length}
                        />

                        <RuleChecklist password={password} />
                    </div>

                    <div>
                        <Field id="confirmPassword" label="Confirm password">
                            <PasswordInput
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={saving}
                                placeholder="Re-enter your password"
                                describedBy="confirm-status"
                            />
                        </Field>

                        <p
                            id="confirm-status"
                            aria-live="polite"
                            className={`mt-2 min-h-5 text-xs font-medium ${
                                !showMatchStatus
                                    ? "text-transparent"
                                    : passwordsMatch
                                    ? "text-emerald-700"
                                    : "text-red-700"
                            }`}
                        >
                            {showMatchStatus &&
                                (passwordsMatch
                                    ? "Passwords match."
                                    : "Passwords do not match yet.")}
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
                        >
                            <AlertIcon />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none ${focusRing}`}
                    >
                        {saving && <Spinner />}
                        {saving ? "Saving..." : "Create password"}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs leading-6 text-slate-500">
                    Your account is managed by the Municipality of Tagoloan.
                </p>
            </section>
        </AuthShell>
    );
}

export default SetPassword;