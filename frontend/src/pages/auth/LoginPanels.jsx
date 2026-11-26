import {
  AccountSwitch, Field, FormShell, Notice, Pane, PasswordInput, Spinner,
  focusRing, inputBase, inputBad, inputOk,
} from "./LoginComponents";

const citizenReassurances = [
  "Free for citizens",
  "No password needed",
  "Track every update",
];

export function CitizenLoginPanel({
  mode, isPersonnel, isLoading, switchTo, notice, setNotice, googleButtonRef, handleGoogleLogin, activeAction,
}) {
  return (
            <Pane
                active={!isPersonnel}
                className={`flex-col transition-opacity duration-500 motion-reduce:transition-none lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-1/2 lg:overflow-y-auto ${
                    isPersonnel
                        ? "hidden lg:pointer-events-none lg:opacity-0"
                        : "flex opacity-100 lg:delay-300"
                }`}
            >
                <FormShell mainId="citizen-signin">
                    <AccountSwitch
                        mode={mode}
                        onChange={switchTo}
                        disabled={isLoading}
                    />

                    <h1
                        id="citizen-signin-title"
                        className="text-3xl font-semibold tracking-tight text-slate-900"
                    >
                        Citizen sign in
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                        Use your Google account to file a complaint and track
                        its progress.
                    </p>

                    {!isPersonnel && (
                        <Notice
                            notice={notice}
                            onDismiss={() => setNotice(null)}
                        />
                    )}

                    <button
                        ref={googleButtonRef}
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        aria-busy={activeAction === "google"}
                        className={`glass-btn-secondary mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-300 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                    >
                        {activeAction === "google" ? (
                            <Spinner className="h-5 w-5 shrink-0 text-emerald-800" />
                        ) : (
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
                        )}

                        {activeAction === "google"
                            ? "Please wait..."
                            : "Continue with Google"}
                    </button>

                    <p className="mt-4 text-center text-sm leading-6 text-slate-600">
                        We use your Google account only to verify who you are.
                    </p>

                    <ul className="mt-6 flex flex-wrap justify-center gap-2 text-xs font-medium text-slate-700">
                        {citizenReassurances.map((item) => (
                            <li
                                key={item}
                                className="glass-soft rounded-full px-3 py-1.5"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                </FormShell>
            </Pane>

  );
}

export function PersonnelLoginPanel({
  mode, isPersonnel, isLoading, switchTo, notice, setNotice, activeAction, handleSubmit, errors,
  emailRef, email, setEmail, setErrors, passwordRef, password, setPassword,
}) {
  return (
            <Pane
                active={isPersonnel}
                className={`flex-col transition-opacity duration-500 motion-reduce:transition-none lg:absolute lg:inset-y-0 lg:right-0 lg:flex lg:w-1/2 lg:overflow-y-auto ${
                    isPersonnel
                        ? "flex opacity-100 lg:delay-300"
                        : "hidden lg:pointer-events-none lg:opacity-0"
                }`}
            >
                <FormShell mainId="personnel-signin">
                    <AccountSwitch
                        mode={mode}
                        onChange={switchTo}
                        disabled={isLoading}
                    />

                    <h1
                        id="personnel-signin-title"
                        className="text-3xl font-semibold tracking-tight text-slate-900"
                    >
                        LGU personnel sign in
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                        For authorized staff and administrators. Use the email
                        and password issued by the System Administrator.
                    </p>

                    {isPersonnel && (
                        <Notice
                            notice={notice}
                            onDismiss={() => setNotice(null)}
                        />
                    )}

                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        className="mt-8 space-y-5"
                    >
                        <Field
                            id="email"
                            label="Email address"
                            error={errors.email}
                        >
                            <input
                                ref={emailRef}
                                id="email"
                                type="email"
                                inputMode="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);

                                    if (errors.email) {
                                        setErrors((current) => ({
                                            ...current,
                                            email: undefined,
                                        }));
                                    }
                                }}
                                autoComplete="username"
                                disabled={isLoading}
                                aria-invalid={errors.email ? "true" : undefined}
                                aria-describedby={
                                    errors.email ? "email-error" : undefined
                                }
                                className={`${inputBase} ${
                                    errors.email ? inputBad : inputOk
                                }`}
                            />
                        </Field>

                        <Field
                            id="password"
                            label="Password"
                            error={errors.password}
                        >
                            <PasswordInput
                                id="password"
                                inputRef={passwordRef}
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);

                                    if (errors.password) {
                                        setErrors((current) => ({
                                            ...current,
                                            password: undefined,
                                        }));
                                    }
                                }}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={isLoading}
                                error={errors.password}
                            />
                        </Field>

                        <button
                            type="submit"
                            disabled={isLoading}
                            aria-busy={activeAction === "login"}
                            className={`glass-btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                        >
                            {activeAction === "login" && <Spinner />}

                            {activeAction === "login"
                                ? "Signing in..."
                                : "Sign in"}
                        </button>
                    </form>
                </FormShell>
            </Pane>

  );
}
