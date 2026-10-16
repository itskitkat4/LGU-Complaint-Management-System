
import { Link } from "react-router-dom";
import tagoloanSeal from "../../assets/tagoloan-seal.png";
import heroImage from "../../assets/hero.png";
import "./Landing.css";

function Landing() {
  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <header className="landing-navbar">
        <Link to="/" className="landing-logo">
          <img
            src={tagoloanSeal}
            alt="Official Seal of Tagoloan"
            className="logo-image"
          />

          <span>
            Bantay<span className="logo-highlight">Serbisyo</span>
          </span>
        </Link>

        <nav className="landing-nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="landing-nav-actions">
          <Link to="/login" className="login-link">
            Log In
          </Link>

          <Link to="/login" className="get-started-btn">
            Get Started
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-section" id="home">
          <div className="hero-content">
            <span className="hero-label">
              YOUR VOICE. YOUR COMMUNITY.
            </span>

            <h1>
              Better Communities
              <br />
              Start With <span>Your Voice.</span>
            </h1>

            <p className="hero-description">
              BantaySerbisyo makes it easier to report community
              concerns, track complaints, and stay updated on
              the actions taken by your local government.
            </p>

            <div className="hero-buttons">
              <Link to="/login" className="primary-btn">
                Submit a Complaint <span>→</span>
              </Link>

              <a href="#how-it-works" className="secondary-btn">
                Learn How It Works
              </a>
            </div>

            <div className="hero-trust">
              <span className="trust-check">✓</span>
              Accessible. Transparent. Accountable.
            </div>
          </div>

          <div className="hero-image-wrapper">
            <img
              src={heroImage}
              alt="BantaySerbisyo community service"
              className="hero-image"
            />

            <div className="hero-image-caption">
              <span className="caption-icon">✓</span>

              <div>
                <strong>Your concern matters.</strong>
                <p>Help build a better community.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section" id="features">
          <div className="section-heading">
            <span className="section-label">WHAT WE OFFER</span>
            <h2>Public Service Made Easier</h2>
            <p>
              A convenient way to connect community concerns
              with the people responsible for addressing them.
            </p>
          </div>

          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Easy Complaint Submission</h3>
              <p>
                Submit community concerns online without
                needing to visit the LGU office first.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">🔎</div>
              <h3>Track Your Complaints</h3>
              <p>
                Check the progress and status of your submitted
                complaints in one convenient place.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>Transparent Service</h3>
              <p>
                Stay informed as your complaint moves through
                the appropriate review and response process.
              </p>
            </article>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <span className="section-label">GETTING STARTED</span>
            <h2>How BantaySerbisyo Works</h2>
            <p>
              Three simple steps to make your concern heard.
            </p>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <h3>Create an Account</h3>
              <p>
                Get started by creating your citizen account
                and signing in.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number">02</span>
              <h3>Submit Your Concern</h3>
              <p>
                Provide the details of the complaint so it can
                be reviewed by the appropriate personnel.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number">03</span>
              <h3>Track the Progress</h3>
              <p>
                Return to your account to check complaint
                updates and responses.
              </p>
            </article>
          </div>

          <div className="how-cta">
            <h2>Ready to make a difference?</h2>
            <p>
              Your community starts with your participation.
            </p>

            <Link to="/login" className="primary-btn">
              Get Started Today →
            </Link>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section" id="faq">
          <div className="section-heading">
            <span className="section-label">HAVE QUESTIONS?</span>
            <h2>Frequently Asked Questions</h2>
            <p>
              Find answers to common questions about BantaySerbisyo.
            </p>
          </div>

          <div className="faq-list">
            <details className="faq-item">
              <summary>What is BantaySerbisyo?</summary>
              <p>
                BantaySerbisyo helps citizens submit community
                concerns and track their complaints.
              </p>
            </details>

            <details className="faq-item">
              <summary>How can I submit a complaint?</summary>
              <p>
                Create an account, sign in, and provide your
                complaint details.
              </p>
            </details>

            <details className="faq-item">
              <summary>Can I track my complaint?</summary>
              <p>
                Yes, you can check your complaint status
                through your account.
              </p>
            </details>

            <details className="faq-item">
              <summary>Who will review my complaint?</summary>
              <p>
                Authorized LGU personnel will review your complaint.
              </p>
            </details>

            <details className="faq-item">
              <summary>Do I need an account?</summary>
              <p>
                Yes, an account is needed to submit and track complaints.
              </p>
            </details>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <Link to="/" className="landing-logo footer-logo">
          <img
            src={tagoloanSeal}
            alt="Official Seal of Tagoloan"
            className="logo-image"
          />

          <span>
            Bantay<span className="logo-highlight">Serbisyo</span>
          </span>
        </Link>

        <p>
          Making local public service more accessible and
          transparent.
        </p>

        <span className="footer-copyright">
          © {new Date().getFullYear()} BantaySerbisyo
        </span>
      </footer>
    </div>
  );
}

export default Landing;
