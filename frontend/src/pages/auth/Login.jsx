import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import tagoloanSeal from "../../assets/System_Logo.png";
import { supabase } from "../../lib/supabase";
import {
    getCitizenProfile,
    getAuthenticatedProfile,
    ApiError,
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Pane, focusRingLight } from "./LoginComponents";
import { CitizenLoginPanel, PersonnelLoginPanel } from "./LoginPanels";

class LoginValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "LoginValidationError";
    }
}

function isDefinitiveLoginRejection(error) {
    return (
        error instanceof LoginValidationError ||
        (error instanceof ApiError &&
            [401, 403, 404].includes(error.status))
    );
}

const personnelRoles = [
    "System Administrator",
    "LGU-Staff",
    "Barangay_Head",
    "Department_Head",
    "Department_Personnel",
];

const destinations = {
    "System Administrator": "/admin/dashboard",
    "LGU-Staff": "/staff/dashboard",
    "Barangay_Head": "/barangay/dashboard",
    "Department_Head": "/department/dashboard",
    "Department_Personnel": "/personnel/dashboard",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function logAuthTiming(label, startedAt) {
    if (import.meta.env.DEV) {
        console.debug(`[auth-timing] ${label}: ${Math.round(performance.now() - startedAt)}ms`);
    }
}

/*
|--------------------------------------------------------------------------
| Copy
|--------------------------------------------------------------------------
| The same wording is used everywhere: "sign in" (never "log in"),
| "Citizen" and "LGU personnel" for the two account types.
*/

const panelCopy = {
    citizen: {
        headline: "Your concerns, handled in the open.",
        description:
            "Sign in to send a complaint to the Municipality of Tagoloan and follow it from submission to resolution.",
        benefits: [
            "Submit complaints with supporting evidence",
            "Follow every status update in one place",
            "Hear back from authorized personnel",
        ],
    },
    personnel: {
        headline: "Manage and resolve citizen complaints.",
        description:
            "A secure workspace for authorized personnel of the Municipality of Tagoloan.",
        benefits: [
            "Review and assign incoming complaints",
            "Update status and respond to citizens",
            "Monitor resolution progress",
        ],
    },
};



/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/* Turns technical auth errors into plain language with a next step. */
function friendlyAuthError(error, fallback) {
    const message = (error?.message || "").toLowerCase();

    if (
        (typeof navigator !== "undefined" && navigator.onLine  === false) ||
        message.includes("failed to fetch") ||
        message.includes("network")
    ) {
        return "We can't reach the server. Check your internet connection and try again.";
    }

    if (message.includes("invalid login credentials")) {
        return "The email or password is incorrect. Check both and try again. If you have not created your password yet, ask your administrator to send a new invitation.";
    }

    if (message.includes("email not confirmed")) {
        return "This email address has not been confirmed yet. Contact your System Administrator.";
    }

    if (message.includes("rate limit") || message.includes("too many")) {
        return "Too many attempts. Wait a few minutes before trying again.";
    }

    return error?.message || fallback;
}

/*
|--------------------------------------------------------------------------
| Reusable Components
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Login Page
|--------------------------------------------------------------------------
| /login            -> citizen (Google)
| /login?as=staff   -> LGU personnel (email and password)
*/

function Login() {
    const navigate = useNavigate();
    const {
        beginLoginProfileResolution,
        setValidatedLoginProfile,
        cancelLoginProfileResolution,
    } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const mode = searchParams.get("as") === "staff" ? "personnel" : "citizen";
    const isPersonnel = mode === "personnel";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [notice, setNotice] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeAction, setActiveAction] = useState(null);

    const googleButtonRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const firstRender = useRef(true);
    const authAttemptStartedAt = useRef(null);
    const googleCallbackPromise = useRef(null);

    /*
    |--------------------------------------------------------------------------
    | Switching between citizen and personnel
    |--------------------------------------------------------------------------
    */

    function switchTo(next) {
        if (isLoading || next === mode) {
            return;
        }

        setNotice(null);
        setErrors({});
        setPassword("");
        setSearchParams(next === "personnel" ? { as: "staff" } : {});
    }

    // Move focus to the first control once the slide has finished.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        const timer = setTimeout(
            () => {
                (isPersonnel ? emailRef : googleButtonRef).current?.focus();
            },
            reduceMotion ? 0 : 500
        );

        return () => clearTimeout(timer);
    }, [isPersonnel]);

    /*
    |--------------------------------------------------------------------------
    | Authentication and Redirection
    |--------------------------------------------------------------------------
    */

    const finishLogin = useCallback(
        async (expectedAccountType, authenticatedUser) => {
            const finishStartedAt = performance.now();

            try {
                const profileStartedAt = performance.now();
                const result =
                    expectedAccountType === "citizen"
                        ? await getCitizenProfile()
                        : await getAuthenticatedProfile();
                logAuthTiming("first backend-validated profile retrieval", profileStartedAt);

                if (!result?.profile) {
                    throw new LoginValidationError(
                        "Your user profile could not be retrieved."
                    );
                }

                const profile = result.profile;
                const role = profile.role;

                if (
                    expectedAccountType === "citizen" &&
                    role !== "citizen"
                ) {
                    throw new LoginValidationError(
                        "This is an LGU personnel account. Switch to LGU personnel sign in."
                    );
                }

                if (
                    expectedAccountType === "personnel" &&
                    !personnelRoles.includes(role)
                ) {
                    throw new LoginValidationError(
                        "This is a citizen account. Switch to Citizen sign in and use Google."
                    );
                }

                const destination =
                    role === "citizen" ? null : destinations[role];
                if (role !== "citizen" && !destination) {
                    throw new LoginValidationError(
                        "Your account has an unrecognized role."
                    );
                }

                try {
                    setValidatedLoginProfile(profile, authenticatedUser);
                } catch (error) {
                    throw new LoginValidationError(error.message);
                }

                setNotice({
                    type: "success",
                    text: "Signed in. Taking you to your dashboard...",
                });

                // Citizen navigation.
                if (role === "citizen") {
                    if (
                        result.requires_onboarding ||
                        !profile.barangay_id
                    ) {
                        navigate("/onboarding", { replace: true });
                    } else {
                        navigate("/citizen/dashboard", {
                            replace: true,
                        });
                    }

                    logAuthTiming(
                        "login to dashboard navigation",
                        authAttemptStartedAt.current ?? finishStartedAt
                    );
                    return;
                }

                // Personnel navigation.
                navigate(destination, { replace: true });
                logAuthTiming(
                    "login to dashboard navigation",
                    authAttemptStartedAt.current ?? finishStartedAt
                );
            } catch (error) {
                const definitiveRejection = isDefinitiveLoginRejection(error);
                if (definitiveRejection) {
                    try {
                        const { error: signOutError } =
                            await supabase.auth.signOut({ scope: "local" });
                        if (signOutError) {
                            console.error(
                                "Failed to clear the rejected local login session:",
                                signOutError.message
                            );
                        }
                    } catch (signOutError) {
                        console.error(
                            "Failed to clear the rejected local login session:",
                            signOutError?.message || "Unexpected sign-out error."
                        );
                    }
                }

                await cancelLoginProfileResolution({
                    restoreSession: !definitiveRejection,
                }).catch((resolutionError) => {
                    console.error("Failed to restore authentication state after login error:", resolutionError);
                });
                throw error;
            }
        },
        [navigate, setValidatedLoginProfile, cancelLoginProfileResolution]
    );

    /*
    |--------------------------------------------------------------------------
    | Google OAuth Callback
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const isGoogleCallback = params.get("auth") === "google";

        if (!isGoogleCallback) {
            return;
        }

        let active = true;

        async function verifyGoogleLogin() {
            try {
                authAttemptStartedAt.current = performance.now();
                beginLoginProfileResolution();
                setIsLoading(true);
                setActiveAction("google");

                setNotice({
                    type: "info",
                    text: "Checking your Google sign in...",
                });

                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();
                logAuthTiming("OAuth callback session retrieval", authAttemptStartedAt.current);

                if (error) {
                    throw error;
                }

                if (!session?.access_token) {
                    throw new Error(
                        "Google sign in was not completed. Please try again."
                    );
                }

                await finishLogin("citizen", session.user);
                return null;
            } catch (error) {
                await cancelLoginProfileResolution().catch((resolutionError) => {
                    console.error("Failed to restore authentication state after OAuth error:", resolutionError);
                });

                return error;
            } finally {
                window.history.replaceState({}, "", "/login");
            }
        }

        // Share one callback run across StrictMode's setup/cleanup/setup replay.
        if (!googleCallbackPromise.current) {
            googleCallbackPromise.current = verifyGoogleLogin();
        }

        void googleCallbackPromise.current.then((error) => {
            if (active && error) {
                setNotice({
                    type: "error",
                    text: friendlyAuthError(
                        error,
                        "Unable to verify your citizen account."
                    ),
                });
            }

            if (active) {
                setIsLoading(false);
                setActiveAction(null);
            }
        });

        return () => {
            active = false;
        };
    }, [beginLoginProfileResolution, cancelLoginProfileResolution, finishLogin]);

    /*
    |--------------------------------------------------------------------------
    | Citizen Login
    |--------------------------------------------------------------------------
    */

    async function handleGoogleLogin() {
        if (isLoading) {
            return;
        }

        setIsLoading(true);
        setActiveAction("google");

        setNotice({
            type: "info",
            text: "Opening Google sign in...",
        });

        try {
            const { error } =
                await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo: `${window.location.origin}/login?auth=google`,
                        queryParams: {
                            prompt: "select_account",
                        },
                    },
                });

            if (error) {
                throw error;
            }
        } catch (error) {
            setNotice({
                type: "error",
                text: friendlyAuthError(
                    error,
                    "Unable to sign in with Google. Please try again."
                ),
            });

            setIsLoading(false);
            setActiveAction(null);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Personnel Login
    |--------------------------------------------------------------------------
    */

    function validateCredentials() {
        const next = {};
        const normalizedEmail = email.trim();

        if (!normalizedEmail) {
            next.email = "Enter your email address.";
        } else if (!emailPattern.test(normalizedEmail)) {
            next.email =
                "Enter a valid email address, for example name@example.com.";
        }

        if (!password) {
            next.password = "Enter your password.";
        }

        setErrors(next);

        if (next.email) {
            emailRef.current?.focus();
        } else if (next.password) {
            passwordRef.current?.focus();
        }

        return Object.keys(next).length === 0;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (isLoading) {
            return;
        }

        setNotice(null);

        if (!validateCredentials()) {
            return;
        }

        setIsLoading(true);
        setActiveAction("login");
        authAttemptStartedAt.current = performance.now();
        beginLoginProfileResolution();

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                    email: email.trim().toLowerCase(),
                    password,
                });
            logAuthTiming("Supabase password sign-in", authAttemptStartedAt.current);

            if (error) {
                throw error;
            }

            await finishLogin("personnel", data.user);
        } catch (error) {
            await cancelLoginProfileResolution().catch((resolutionError) => {
                console.error("Failed to restore authentication state after login error:", resolutionError);
            });

            setNotice({
                type: "error",
                text: friendlyAuthError(
                    error,
                    "Sign in failed. Please try again."
                ),
            });

            setPassword("");
            passwordRef.current?.focus();
        } finally {
            setIsLoading(false);
            setActiveAction(null);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Page UI
    |--------------------------------------------------------------------------
    */

    return (
        <div className="app-bg relative min-h-screen overflow-hidden font-sans text-slate-900 antialiased">
            {/* Skip link for keyboard users */}
            <a
                href={isPersonnel ? "#personnel-signin" : "#citizen-signin"}
                className="sr-only z-50 rounded-md bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2 focus:ring-emerald-700"
            >
                Skip to sign in form
            </a>

            {/* Announces the active form to screen reader users */}
            <p className="sr-only" role="status" aria-live="polite">
                {isPersonnel
                    ? "LGU personnel sign in form shown"
                    : "Citizen sign in form shown"}
            </p>

            {/* ---------- Citizen form (left half) ---------- */}
            <CitizenLoginPanel
              mode={mode}
              isPersonnel={isPersonnel}
              isLoading={isLoading}
              switchTo={switchTo}
              notice={notice}
              setNotice={setNotice}
              googleButtonRef={googleButtonRef}
              handleGoogleLogin={handleGoogleLogin}
              activeAction={activeAction}
            />

            <PersonnelLoginPanel
              mode={mode}
              isPersonnel={isPersonnel}
              isLoading={isLoading}
              switchTo={switchTo}
              notice={notice}
              setNotice={setNotice}
              activeAction={activeAction}
              handleSubmit={handleSubmit}
              errors={errors}
              emailRef={emailRef}
              email={email}
              setEmail={setEmail}
              setErrors={setErrors}
              passwordRef={passwordRef}
              password={password}
              setPassword={setPassword}
            />

            {/* ---------- Sliding side panel (large screens only) ---------- */}
            <aside
                aria-label="About BantaySerbisyo"
                className={`absolute inset-y-0 left-0 z-10 hidden w-1/2 overflow-hidden bg-emerald-950 text-white transition-transform duration-700 ease-in-out motion-reduce:transition-none lg:block ${
                    isPersonnel
                        ? "translate-x-0"
                        : "translate-x-full"
                }`}
            >
                {/* Municipal hall photo with a deep green wash */}
                <img
                    src="/tagoloan-hall.jpg"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover object-[50%_40%]"
                />
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-br from-emerald-950/90 via-emerald-900/80 to-emerald-700/60"
                />

                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-32 -bottom-32 h-[28rem] w-[28rem] rounded-full border border-white/10"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-12 -bottom-12 h-[18rem] w-[18rem] rounded-full border border-white/10"
                />

                <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
                    <Link
                        to="/"
                        className={`flex w-fit items-center gap-3 rounded-md ${focusRingLight}`}
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

                    <div className="grid max-w-md">
                        {Object.entries(panelCopy).map(([key, copy]) => {
                            const active = key === mode;

                            return (
                                <Pane
                                    key={key}
                                    active={active}
                                    className={`col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none ${
                                        active
                                            ? "opacity-100 delay-300"
                                            : "pointer-events-none opacity-0"
                                    }`}
                                >
                                    <p className="text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
                                        {copy.headline}
                                    </p>

                                    <p className="mt-4 text-base leading-7 text-emerald-100/90">
                                        {copy.description}
                                    </p>

                                    <div className="mt-8 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
                                        <ul className="space-y-4">
                                            {copy.benefits.map((item) => (
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
                                </Pane>
                            );
                        })}
                    </div>

                    <p className="text-sm text-emerald-100/80">
                        Municipality of Tagoloan
                    </p>
                </div>
            </aside>
        </div>
    );
}

export default Login;
