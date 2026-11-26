import { useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "../../context/ThemeContext";
import tagoloanSeal from "../../assets/System_Logo.png";

const features = [
  {
    title: "Report without visiting the office",
    description:
      "File a complaint online with details and supporting evidence, any time of day.",
    icon: (
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Follow every status change",
    description:
      "See exactly where your complaint stands, from submission to resolution, in one place.",
    icon: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.2-4.2" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Clear, accountable handling",
    description:
      "Authorized personnel review each complaint, and every action taken is visible to you.",
    icon: (
      <path
        d="M12 3 5 6v5c0 4.4 2.9 8.3 7 10 4.1-1.7 7-5.6 7-10V6l-7-3Z M9 12l2 2 4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

const steps = [
  {
    title: "Sign in with Google",
    description:
      "Use your existing Google account. No separate citizen password is needed.",
  },
  {
    title: "Submit your concern",
    description:
      "Describe the issue, add supporting evidence, and send it for review.",
  },
  {
    title: "Track the progress",
    description:
      "Check your complaint status and read updates from authorized personnel.",
  },
];

const faqs = [
  {
    question: "What is BantaySerbisyo?",
    answer:
      "BantaySerbisyo is a digital platform where citizens submit community concerns and track their complaints.",
  },
  {
    question: "How can I submit a complaint?",
    answer:
      "Sign in with your Google account, complete your citizen profile if asked, then enter your complaint details.",
  },
  {
    question: "Can I track my complaint?",
    answer:
      "Yes. Your citizen account lists every complaint you have submitted, along with its current status and updates.",
  },
  {
    question: "Who will review my complaint?",
    answer:
      "Authorized personnel review your complaint and decide how it should be handled.",
  },
  {
    question: "Do I need to create a separate account?",
    answer:
      "No. Citizens sign in with Google authentication, so there is no extra password to remember.",
  },
  {
    question: "Can I use BantaySerbisyo for emergencies?",
    answer:
      "No. BantaySerbisyo is intended for non-urgent community concerns. For emergencies that require immediate assistance, contact the appropriate emergency responders directly.",
  },
];

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

const trackerStages = [
  { label: "Submitted", note: "Oct 14, 9:12 AM", state: "done" },
  { label: "Under review", note: "Oct 15, 2:40 PM", state: "current" },
  { label: "Action taken", note: "Pending", state: "todo" },
  { label: "Resolved", note: "Pending", state: "todo" },
];

/*
| Replace the placeholder with the real DRRMO number, for example "(088) 123-4567".
| While it contains no digits, it is shown as plain text instead of a call link.
*/
const EMERGENCY_HOTLINE = "[(+936) 123-4567]";

const container = "mx-auto w-full max-w-6xl px-6 sm:px-8";
const sectionSpace = "scroll-mt-20 py-20 sm:py-28";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

const darkFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950";

/* ------------------------------------------------------------------ */
/* Small reusable components                                           */
/* ------------------------------------------------------------------ */

function Icon({ children, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function Check({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      className={className}
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

function SectionHeading({ title, description, align = "center" }) {
  return (
    <div
      className={`lg-reveal ${
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-md"
      }`}
    >
      <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>

      <p className="mt-4 text-base leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Emergency notice (inside the call-to-action card)                   */
/* ------------------------------------------------------------------ */

function EmergencyNotice() {
  const hasNumber = /\d/.test(EMERGENCY_HOTLINE);
  const hotlineHref = `tel:${EMERGENCY_HOTLINE.replace(/[^\d+]/g, "")}`;

  return (
    <div
      role="region"
      aria-label="Emergency contacts"
      className="border-t border-white/10 bg-white/5 px-8 py-5 sm:px-12"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon className="h-4 w-4 shrink-0 text-red-300">
            <path
              d="M12 9v4m0 4h.01M10.3 3.9 2.7 17.3a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Icon>
          Life-threatening emergency?
        </p>

        <a
          href="tel:911"
          className={`inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 ${darkFocusRing}`}
        >
          <Icon className="h-3.5 w-3.5">
            <path
              d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Icon>
          Call 911
        </a>

        <p className="text-sm text-emerald-100/80">
          Municipal EMERGENCY hotline:{" "}
          {hasNumber ? (
            <a
              href={hotlineHref}
              className={`rounded font-semibold text-white underline underline-offset-2 hover:text-emerald-100 ${darkFocusRing}`}
            >
              {EMERGENCY_HOTLINE}
            </a>
          ) : (
            <span className="font-semibold text-white">{EMERGENCY_HOTLINE}</span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero visual                                                         */
/* ------------------------------------------------------------------ */

function HeroVisual() {
  const currentIndex = trackerStages.findIndex((stage) => stage.state === "current");
  const current = trackerStages[currentIndex];

  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Soft green shapes behind the photo */}
      <div
        aria-hidden="true"
        className="absolute -bottom-4 -right-6 h-52 w-80 rounded-full bg-gradient-to-br from-emerald-200/80 to-emerald-500/60 blur-sm sm:h-64 sm:w-[26rem]"
      />
      <div
        aria-hidden="true"
        className="absolute -left-5 -top-5 h-24 w-24 rounded-full bg-emerald-300/40 blur-xl"
      />

      {/* Municipal hall photo in a glass frame */}
      <div className="glass relative rounded-[2.5rem] rounded-bl-[6rem] p-2">
        <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] rounded-bl-[5rem]">
          <img
            src="/tagoloan-hall.jpg"
            alt="Balay Lungsod sa Tagoloan, the Tagoloan municipal hall"
            className="lg-kenburns h-full w-full object-cover object-[50%_40%] brightness-[1.04] contrast-[0.96] saturate-[0.8]"
          />

          {/* Mint wash so the bright lime paint sits with the theme */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-emerald-300/25 mix-blend-soft-light"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-emerald-950/30 via-transparent to-white/20"
          />

          {/* Place label */}
          <span className="glass-soft absolute left-4 top-4 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-800 sm:inline-flex">
            <Icon className="h-3.5 w-3.5 text-emerald-700">
              <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
              <circle cx="12" cy="10" r="2.5" />
            </Icon>
            Tagoloan Municipal Hall
          </span>
        </div>
      </div>

      {/* Notification */}
      <div
        className="lg-rise lg-rise-delay-1300 absolute -right-3 top-8 w-60 sm:-right-6"
      >
        <div className="glass lg-float flex items-center gap-3 rounded-2xl p-3">
          <span className="glass-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <Icon className="h-5 w-5">
              <path
                d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z M10 19a2 2 0 0 0 4 0"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Icon>
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">Status updated</p>
            <p className="text-xs text-slate-500">Your complaint is now under review.</p>
          </div>
        </div>
      </div>

      {/* Compact progress card */}
      <div
        className="lg-rise lg-rise-delay-900 absolute -bottom-8 left-4 right-4 sm:-left-6 sm:right-auto sm:w-80"
      >
        <div className="glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Complaint reference</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">BS-2026-00142</p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {current.label}
            </span>
          </div>

          <p className="mt-3 text-sm font-medium text-slate-900">
            Broken streetlight along the barangay road
          </p>

          <div
            role="img"
            aria-label={`Step ${currentIndex + 1} of ${trackerStages.length}: ${current.label}`}
            className="mt-3 flex gap-1.5"
          >
            {trackerStages.map((stage) => (
              <span
                key={stage.label}
                className={`h-1.5 flex-1 rounded-full ${
                  stage.state === "done"
                    ? "bg-emerald-600"
                    : stage.state === "current"
                      ? "bg-emerald-400"
                      : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Step {currentIndex + 1} of {trackerStages.length} · {current.note}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ component                                                       */
/* ------------------------------------------------------------------ */

function FaqItem({ faq, id, isOpen, onToggle }) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`faq-panel-${id}`}
          id={`faq-button-${id}`}
          className={`flex w-full items-center justify-between gap-6 py-5 text-left ${focusRing} focus-visible:ring-offset-4`}
        >
          <span
            className={`text-base font-medium transition-colors ${
              isOpen ? "text-emerald-800" : "text-slate-900"
            }`}
          >
            {faq.question}
          </span>

          <span
            aria-hidden="true"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
              isOpen
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-300 text-slate-500"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                d="m6 9 6 6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </h3>

      <div
        id={`faq-panel-${id}`}
        role="region"
        aria-labelledby={`faq-button-${id}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="max-w-xl pb-5 text-sm leading-7 text-slate-600">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Landing page                                                        */
/* ------------------------------------------------------------------ */

function Landing() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="app-bg lg-live min-h-screen scroll-smooth font-sans text-slate-900 antialiased">
      {/* Navigation */}
      <header className="glass sticky top-0 z-50">
        <div
          className={`${container} flex h-16 items-center justify-between gap-6`}
        >
          <Link
            to="/"
            className={`flex shrink-0 items-center gap-2.5 rounded-full ${focusRing}`}
            aria-label="BantaySerbisyo home"
          >
            <img
              src={tagoloanSeal}
              alt="Official Seal of Tagoloan"
              className="h-9 w-9 shrink-0 object-contain"
            />

            <span className="text-lg font-bold tracking-tight text-slate-900">
              Bantay
              <span className="font-semibold text-emerald-800">
                Serbisyo
              </span>
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 text-sm font-medium text-slate-600 md:flex"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`glass-hover rounded-full px-4 py-2 hover:text-slate-900 ${focusRing}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Navbar actions */}
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />

            <Link
              to="/login"
              className={`hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-emerald-800 sm:block ${focusRing}`}
            >
              Log in
            </Link>

            <Link
              to="/login"
              className={`glass-btn-primary rounded-full px-4 py-2.5 text-sm font-semibold sm:px-5 ${focusRing}`}
            >
              Get started
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <nav
          aria-label="Section navigation"
          className="flex justify-center gap-1 border-t border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 md:hidden"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`glass-hover rounded-full px-3 py-1.5 ${focusRing}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section id="home" className="scroll-mt-20 overflow-hidden">
          <div
            className={`${container} grid items-center gap-16 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-28`}
          >
            <div>
              <h1
                className="lg-rise lg-rise-delay-50 max-w-xl text-4xl leading-[1.1] font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]"
              >
                Report community concerns and see them through.
              </h1>

              <p
                className="lg-rise lg-rise-delay-180 mt-6 max-w-lg text-lg leading-8 text-slate-600"
              >
                BantaySerbisyo lets you send a complaint to your local
                government, then follow each step until it is resolved.
              </p>

              <div
                className="lg-rise lg-rise-delay-300 mt-9 flex flex-wrap items-center gap-3"
              >
                <Link
                  to="/login"
                  className={`glass-btn-primary inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold ${focusRing}`}
                >
                  Submit a complaint
                </Link>

                <a
                  href="#how-it-works"
                  className={`glass-btn-secondary inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-slate-800 ${focusRing}`}
                >
                  See how it works
                </a>
              </div>

              <ul
                className="lg-rise lg-rise-delay-420 mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600"
              >
                {[
                  "Free for citizens",
                  "Sign in with Google",
                  "Track every update",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="glass-icon flex h-5 w-5 items-center justify-center rounded-full">
                      <Check className="h-3 w-3" />
                    </span>

                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="lg-rise lg-rise-delay-250 pb-10 lg:pl-6"
            >
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className={sectionSpace}>
          <div className={container}>
            <SectionHeading
              title="Public service, made easier"
              description="A direct line between residents and the people responsible for addressing their concerns."
            />

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="glass lg-reveal rounded-3xl p-8"
                >
                  <span className="glass-icon flex h-12 w-12 items-center justify-center rounded-full">
                    <Icon className="h-5 w-5">{feature.icon}</Icon>
                  </span>

                  <h3 className="mt-6 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className={sectionSpace}>
          <div className={container}>
            <SectionHeading
              title="How BantaySerbisyo works"
              description="Three steps from sign-in to a resolved concern."
            />

            <ol className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
              <div
                aria-hidden="true"
                className="lg-draw absolute top-6 right-[16.66%] left-[16.66%] hidden h-px bg-slate-200 md:block"
              />

              {steps.map((step, i) => (
                <li key={step.title} className="lg-reveal relative text-center">
                  <span className="glass-icon relative mx-auto flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold">
                    {i + 1}
                  </span>

                  <h3 className="mt-6 text-lg font-semibold text-slate-900">
                    {step.title}
                  </h3>

                  <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-slate-600">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>

            {/* CTA */}
            <div className="lg-reveal mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-xl shadow-emerald-900/25">
              <div className="flex flex-col items-start justify-between gap-8 px-8 py-12 sm:px-12 md:flex-row md:items-center">
                <div className="max-w-lg">
                  <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Have a concern in your community?
                  </h2>

                  <p className="mt-3 text-base leading-7 text-emerald-100/80">
                    Sign in and send your first complaint in a few minutes.
                  </p>
                </div>

                <Link
                  to="/login"
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950"
                >
                  Submit a complaint
                </Link>
              </div>

              <EmergencyNotice />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={sectionSpace}>
          <div
            className={`${container} grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20`}
          >
            <SectionHeading
              align="left"
              title="Frequently asked questions"
              description="Quick answers about submitting and tracking complaints."
            />

            <div className="glass lg-reveal rounded-3xl px-6 sm:px-8">
              {faqs.map((faq, index) => (
                <FaqItem
                  key={faq.question}
                  id={index}
                  faq={faq}
                  isOpen={openFaq === index}
                  onToggle={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="glass">
        <div
          className={`${container} flex flex-col items-center justify-between gap-5 py-10 text-center md:flex-row md:text-left`}
        >
          <Link
            to="/"
            className={`flex items-center gap-2.5 rounded-full ${focusRing}`}
          >
            <img
              src={tagoloanSeal}
              alt="Official Seal of Tagoloan"
              className="h-9 w-9 object-contain"
            />

            <span className="text-base font-bold text-slate-900">
              Bantay
              <span className="font-semibold text-emerald-800">
                Serbisyo
              </span>
            </span>
          </Link>

          <p className="max-w-sm text-sm leading-6 text-slate-600">
            Making local public service more accessible and transparent.
          </p>

          <span className="text-xs text-slate-500">
            © {new Date().getFullYear()} BantaySerbisyo
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
