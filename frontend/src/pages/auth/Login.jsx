
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import tagoloanSeal from "../../assets/System_Logo.png";
import { supabase } from "../../lib/supabase";
import { getCitizenProfile } from "../../lib/api";

const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

const inputClass =
    "block min-h-12 w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10";

const benefits = [
    "Submit complaints with supporting evidence",
    "Follow every status update in one place",
    "Hear back from authorized personnel",
];

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

function PasswordInput({
    id,
    value,
    onChange,
    placeholder,
    autoComplete,
    disabled,
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input
                id={id}
                type={visible ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                minLength={8}
                required
                disabled={disabled}
                className={`${inputClass} pr-16 disabled:cursor-not-allowed disabled:bg-slate-100`}
            />

            <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                disabled={disabled}
                className={`absolute inset-y-0 right-0 my-1.5 mr-1.5 rounded px-3 text-xs font-semibold text-slate-500 transition-colors hover:text-emerald-800 disabled:opacity-50 ${focusRing}`}
            >
                {visible ? "Hide" : "Show"}
            </button>
        </div>
    );
}

function Login() {
    const navigate = useNavigate();

    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [notice, setNotice] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Verify the Supabase session through the Laravel API.
    async function finishLogin() {
        const result = await getCitizenProfile();

        if (!result?.profile) {
            throw new Error(
                "Your citizen profile could not be retrieved."
            );
        }

        if (result.profile.role !== "citizen") {
            await supabase.auth.signOut();

            throw new Error(
                "This account is not registered as a citizen account."
            );
        }

        navigate("/citizen/dashboard", { replace: true });
    }

    // Check whether the user already has an authenticated session.
    useEffect(() => {
        let active = true;

        async function checkExistingSession() {
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (!active) return;

                if (error) throw error;

                if (!session?.access_token) return;

                setIsLoading(true);

                await finishLogin();
            } catch (error) {
                if (active) {
                    setNotice({
                        type: "error",
                        text:
                            error.message ||
                            "Unable to verify your citizen profile.",
                    });
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        checkExistingSession();

        return () => {
            active = false;
        };
    }, []);

    // Sign in using Google OAuth.
    async function handleGoogleLogin() {
        if (isLoading) return;

        setIsLoading(true);
        setNotice({
            type: "info",
            text: "Connecting to Google...",
        });

        try {

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/login`,
                    queryParams: {
                        prompt: "select_account",
                    },
                },
            });


            if (error) throw error;
        } catch (error) {
            setNotice({
                type: "error",
                text: error.message || "Unable to sign in with Google.",
            });
            setIsLoading(false);
        }
    }

    // Register an account or sign in using email and password.
    async function handleSubmit(event) {
        event.preventDefault();

        if (isLoading) return;

        setNotice(null);

        const normalizedEmail = email.trim().toLowerCase();

        if (isRegister && !fullName.trim()) {
            setNotice({
                type: "error",
                text: "Please enter your full name.",
            });
            return;
        }

        if (isRegister && password !== confirmPassword) {
            setNotice({
                type: "error",
                text: "Your passwords do not match.",
            });
            return;
        }

        setIsLoading(true);

        try {
            if (isRegister) {
                const { data, error } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password,
                    options: {
                        data: {
                            full_name: fullName.trim(),
                        },
                    },
                });

                if (error) throw error;

                if (data.session) {
                    setNotice({
                        type: "info",
                        text:
                            "Your account was created successfully. You can now sign in.",
                    });

                    setIsRegister(false);
                    setPassword("");
                    setConfirmPassword("");
                } else {
                    setNotice({
                        type: "info",
                        text:
                            "Registration submitted. Check your email for a confirmation link before signing in.",
                    });
                }

                return;
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (error) throw error;

            await finishLogin();
        } catch (error) {
            setNotice({
                type: "error",
                text:
                    error.message ||
                    "Authentication failed. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Request a password reset email.
    async function handleForgotPassword() {
        if (isLoading) return;

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setNotice({
                type: "info",
                text: "Enter your email address first to reset your password.",
            });
            return;
        }

        setNotice(null);
        setIsLoading(true);

        try {
            const { error } =
                await supabase.auth.resetPasswordForEmail(
                    normalizedEmail,
                    {
                        redirectTo: `${window.location.origin}/reset-password`,
                    }
                );

            if (error) throw error;

            setNotice({
                type: "info",
                text:
                    "If an account exists for that email, a password reset link will be sent.",
            });
        } catch (error) {
            setNotice({
                type: "error",
                text:
                    error.message ||
                    "Unable to request a password reset.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Switch between login and registration.
    function toggleMode() {
        setIsRegister((current) => !current);
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setNotice(null);
    }

    return (
        <div className="grid min-h-screen bg-white font-sans text-slate-900 antialiased lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
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
                        src={tagoloanSeal}
                        alt="Official Seal of Tagoloan"
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
                        Your concerns, handled in the open.
                    </h2>

                    <p className="mt-4 text-base leading-7 text-emerald-100/80">
                        Log in to send a complaint to the Municipality of
                        Tagoloan and watch it move from submission to
                        resolution.
                    </p>

                    <ul className="mt-9 space-y-4">
                        {benefits.map((item) => (
                            <li
                                key={item}
                                className="flex items-start gap-3 text-sm leading-6 text-emerald-50"
                            >
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-3 w-3"
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
                                </span>

                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-emerald-100/60">
                    Municipality of Tagoloan
                </p>
            </aside>

            <div className="flex min-h-screen flex-col">
                <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
                    <Link
                        to="/"
                        className={`flex items-center gap-2.5 rounded-md lg:invisible ${focusRing}`}
                        aria-label="BantaySerbisyo home"
                    >
                        <img
                            src={tagoloanSeal}
                            alt="Official Seal of Tagoloan"
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
                        aria-labelledby="auth-title"
                    >
                        <h1
                            id="auth-title"
                            className="text-3xl font-semibold tracking-tight text-slate-900"
                        >
                            {isRegister
                                ? "Create your account"
                                : "Welcome back"}
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {isRegister
                                ? "Create an account to submit and track complaints."
                                : "Log in to submit complaints and track your concerns."}
                        </p>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className={`mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                        >
                            <svg
                                className="h-5 w-5 shrink-0"
                                viewBox="0 0 48 48"
                                aria-hidden="true"
                            >
                                <path
                                    fill="#4285F4"
                                    d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.3 0-9.8-3.6-11.4-8.4H5.7v5.3A20 20 0 0 0 24 44z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.7a20 20 0 0 0 0 18z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8A19.5 19.5 0 0 0 24 4 20 20 0 0 0 5.7 15l6.9 5.3c1.6-4.8 6.1-8.4 11.4-8.4z"
                                />
                            </svg>

                            {isLoading
                                ? "Please wait..."
                                : "Continue with Google"}
                        </button>

                        <div className="my-7 flex items-center gap-4 text-xs text-slate-500">
                            <span className="h-px flex-1 bg-slate-200" />
                            or use your email
                            <span className="h-px flex-1 bg-slate-200" />
                        </div>

                        {notice && (
                            <div
                                role={
                                    notice.type === "error"
                                        ? "alert"
                                        : "status"
                                }
                                className={`mb-5 flex items-start gap-3 rounded-md border px-4 py-3 text-sm leading-6 ${notice.type === "error"
                                        ? "border-red-200 bg-red-50 text-red-800"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-900"
                                    }`}
                            >
                                <p className="flex-1">{notice.text}</p>

                                <button
                                    type="button"
                                    onClick={() => setNotice(null)}
                                    aria-label="Dismiss message"
                                    className={`-mr-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 ${focusRing}`}
                                >
                                    <span aria-hidden="true">×</span>
                                </button>
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >
                            {isRegister && (
                                <Field
                                    id="fullName"
                                    label="Full name"
                                >
                                    <input
                                        id="fullName"
                                        type="text"
                                        placeholder="Juan Dela Cruz"
                                        value={fullName}
                                        onChange={(event) =>
                                            setFullName(event.target.value)
                                        }
                                        autoComplete="name"
                                        required
                                        disabled={isLoading}
                                        className={inputClass}
                                    />
                                </Field>
                            )}

                            <Field
                                id="email"
                                label="Email address"
                            >
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    autoComplete="email"
                                    required
                                    disabled={isLoading}
                                    className={inputClass}
                                />
                            </Field>

                            <Field
                                id="password"
                                label="Password"
                            >
                                <PasswordInput
                                    id="password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    placeholder={
                                        isRegister
                                            ? "At least 8 characters"
                                            : "Enter your password"
                                    }
                                    autoComplete={
                                        isRegister
                                            ? "new-password"
                                            : "current-password"
                                    }
                                    disabled={isLoading}
                                />
                            </Field>

                            {isRegister && (
                                <Field
                                    id="confirmPassword"
                                    label="Confirm password"
                                >
                                    <PasswordInput
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(event) =>
                                            setConfirmPassword(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Re-enter your password"
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                    />
                                </Field>
                            )}

                            {!isRegister && (
                                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                    <label className="flex items-center gap-2 text-slate-600">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-300 accent-emerald-800"
                                        />
                                        Remember me
                                    </label>

                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        disabled={isLoading}
                                        className={`rounded font-semibold text-emerald-800 hover:underline disabled:opacity-50 ${focusRing}`}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-800 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                            >
                                {isLoading
                                    ? "Please wait..."
                                    : isRegister
                                        ? "Create account"
                                        : "Log in"}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-sm text-slate-600">
                            {isRegister
                                ? "Already have an account?"
                                : "New to BantaySerbisyo?"}{" "}

                            <button
                                type="button"
                                onClick={toggleMode}
                                disabled={isLoading}
                                className={`rounded font-semibold text-emerald-800 hover:underline disabled:opacity-50 ${focusRing}`}
                            >
                                {isRegister
                                    ? "Log in"
                                    : "Create an account"}
                            </button>
                        </p>
                    </section>
                </main>

                <footer className="px-6 py-6 text-center text-xs text-slate-500 sm:px-10">
                    © {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan
                </footer>
            </div>
        </div>
    );
}

export default Login;
