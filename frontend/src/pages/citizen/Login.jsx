
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import tagoloanSeal from "../../assets/tagoloan-seal.png";
import "./Login.css";

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();

    if (isRegister && password !== confirmPassword) {
      alert("Dili magkapareho ang imong password.");
      return;
    }

    alert(
      isRegister
        ? "Ang account registration kinahanglan pa ikonekta sa authentication backend."
        : "Ang login kinahanglan pa ikonekta sa authentication backend."
    );
  }

  function handleGoogleLogin() {
    alert("Ang Google sign-in kinahanglan pa i-setup sa authentication provider.");
  }

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <Link to="/" className="auth-brand">
          <img src={tagoloanSeal} alt="Tagoloan Seal" />
          <span>Bantay<span>Serbisyo</span></span>
        </Link>
        <Link to="/" className="auth-home-link">Back to Home</Link>
      </header>

      <main className="auth-main">
        <section className="auth-card">
          <div className="auth-heading">
            <img src={tagoloanSeal} alt="Official Seal of Tagoloan" />
            <p className="auth-eyebrow">MUNICIPALITY OF TAGOLOAN</p>
            <h1>{isRegister ? "Create an Account" : "Welcome Back!"}</h1>
            <p>
              {isRegister
                ? "Create your account to submit and track complaints."
                : "Log in to submit complaints and track your concerns."}
            </p>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
          >
            <svg
  className="google-logo"
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
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </div>

            {isRegister && (
              <div className="auth-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            )}

            {!isRegister && (
              <div className="auth-options">
                <label className="remember-option">
                  <input type="checkbox" />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    alert("Ang password reset kinahanglan pa ikonekta sa authentication backend.")
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" className="auth-submit">
              {isRegister ? "Create Account" : "Log In"}
              <span>→</span>
            </button>
          </form>

          <p className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsRegister(!isRegister);
                setFullName("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              {isRegister ? "Log In" : "Create Account"}
            </button>
          </p>

          <p className="auth-notice">
            Your account helps you submit complaints and monitor their status.
          </p>
        </section>
      </main>

      <footer className="auth-footer">
        © {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan
      </footer>
    </div>
  );
}

export default Login;
