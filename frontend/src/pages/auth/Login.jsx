import { useState } from "react";
import { Link } from "react-router-dom";
import tagoloanSeal from "../../assets/tagoloan-seal.png";

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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder, autoComplete }) {
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
        className={`${inputClass} pr-16`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className={`absolute inset-y-0 right-0 my-1.5 mr-1.5 rounded px-3 text-xs font-semibold text-slate-500 transition-colors hover:text-emerald-800 ${focusRing}`}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState(null); // { type: "error" | "info", text }

  function handleSubmit(event) {
    event.preventDefault();

    if (isRegister && password !== confirmPassword) {
      setNotice({
        type: "error",
        text: "Dili magkapareho ang imong password.",
      });
      return;
    }

    setNotice({
      type: "info",
      text: isRegister
        ? "Ang account registration kinahanglan pa ikonekta sa authentication backend."
        : "Ang login kinahanglan pa ikonekta sa authentication backend.",
    });
  }

  function handleGoogleLogin() {
    setNotice({
      type: "info",
      text: "Ang Google sign-in kinahanglan pa i-setup sa authentication provider.",
    });
  }

  function toggleMode() {
    setIsRegister((v) => !v);
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNotice(null);
  }

  return (
    <div className="grid min-h-screen bg-white font-sans text-slate-900 antialiased lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel (desktop only) */}
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
            Bantay<span className="font-semibold text-emerald-300">Serbisyo</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
            Your concerns, handled in the open.
          </h2>
          <p className="mt-4 text-base leading-7 text-emerald-100/80">
            Log in to send a complaint to the Municipality of Tagoloan and watch it
            move from submission to resolution.
          </p>

          <ul className="mt-9 space-y-4">
            {benefits.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-emerald-50">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
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

      {/* Form side */}
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
          {/* Logo shown on mobile/tablet only (the brand panel carries it on desktop) */}
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
              Bantay<span className="font-semibold text-emerald-800">Serbisyo</span>
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
          <section className="w-full max-w-md" aria-labelledby="auth-title">
            <h1
              id="auth-title"
              className="text-3xl font-semibold tracking-tight text-slate-900"
            >
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isRegister
                ? "Create an account to submit and track complaints."
                : "Log in to submit complaints and track your concerns."}
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className={`mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 ${focusRing}`}
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15z" />
                <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.3 0-9.8-3.6-11.4-8.4H5.7v5.3A20 20 0 0 0 24 44z" />
                <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.7a20 20 0 0 0 0 18z" />
                <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8A19.5 19.5 0 0 0 24 4 20 20 0 0 0 5.7 15l6.9 5.3c1.6-4.8 6.1-8.4 11.4-8.4z" />
              </svg>
              Continue with Google
            </button>

            <div className="my-7 flex items-center gap-4 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              or use your email
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {notice && (
              <div
                role={notice.type === "error" ? "alert" : "status"}
                className={`mb-5 flex items-start gap-3 rounded-md border px-4 py-3 text-sm leading-6 ${
                  notice.type === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  {notice.type === "error" ? (
                    <path d="M12 8v5m0 3.5v.01M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M12 11v5m0-8.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                <p className="flex-1">{notice.text}</p>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  aria-label="Dismiss message"
                  className={`-mr-1 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 ${focusRing}`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegister && (
                <Field id="fullName" label="Full name">
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                    className={inputClass}
                  />
                </Field>
              )}

              <Field id="email" label="Email address">
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className={inputClass}
                />
              </Field>

              <Field id="password" label="Password">
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                />
              </Field>

              {isRegister && (
                <Field id="confirmPassword" label="Confirm password">
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
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
                    className={`rounded font-semibold text-emerald-800 hover:underline ${focusRing}`}
                    onClick={() =>
                      setNotice({
                        type: "info",
                        text: "Ang password reset kinahanglan pa ikonekta sa authentication backend.",
                      })
                    }
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                className={`flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-800 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900 ${focusRing}`}
              >
                {isRegister ? "Create account" : "Log in"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              {isRegister ? "Already have an account?" : "New to BantaySerbisyo?"}{" "}
              <button
                type="button"
                onClick={toggleMode}
                className={`rounded font-semibold text-emerald-800 hover:underline ${focusRing}`}
              >
                {isRegister ? "Log in" : "Create an account"}
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