import { useState } from "react";
import { Link } from "react-router-dom";
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
];

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

/* Sample data used only for the illustration in the hero. */
const trackerStages = [
  { label: "Submitted", note: "Oct 14, 9:12 AM", state: "done" },
  { label: "Under review", note: "Oct 15, 2:40 PM", state: "current" },
  { label: "Action taken", note: "Pending", state: "todo" },
  { label: "Resolved", note: "Pending", state: "todo" },
];

/* ------------------------------------------------------------------ */
/* Shared tokens                                                       */
/* ------------------------------------------------------------------ */

const container = "mx-auto w-full max-w-6xl px-6 sm:px-8";
const sectionSpace = "scroll-mt-16 py-20 sm:py-28";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

/* ------------------------------------------------------------------ */
/* Small components                                                    */
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
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionHeading({ title, description, align = "center" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-md"}>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

/* The hero visual: a live-looking complaint tracker, built in code. */
function TrackerMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* Soft backdrop panel */}
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-100 via-emerald-50 to-slate-100 sm:-inset-6"
      />

      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-xl shadow-emerald-900/10">
        {/* Window header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Complaint reference</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">BS-2026-00142</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Under review
          </span>
        </div>

        {/* Complaint summary */}
        <div className="px-5 pt-5">
          <p className="text-xs font-medium text-slate-500">Concern</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            Broken streetlight along the barangay road
          </p>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            The light near the elementary school has been out for two weeks.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
              Infrastructure
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
              2 photos attached
            </span>
          </div>
        </div>

        {/* Progress timeline */}
        <ol className="px-5 pt-6 pb-6">
          {trackerStages.map((stage, i) => {
            const isLast = i === trackerStages.length - 1;
            return (
              <li key={stage.label} className="relative flex gap-4 pb-5 last:pb-0">
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-7 left-[13px] h-[calc(100%-1.75rem)] w-px ${
                      stage.state === "done" ? "bg-emerald-600" : "bg-slate-200"
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    stage.state === "done"
                      ? "bg-emerald-700 text-white"
                      : stage.state === "current"
                        ? "bg-white text-emerald-700 ring-2 ring-emerald-700"
                        : "bg-white text-slate-300 ring-2 ring-slate-200"
                  }`}
                >
                  {stage.state === "done" ? (
                    <Check />
                  ) : (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        stage.state === "current" ? "bg-emerald-700" : "bg-slate-200"
                      }`}
                    />
                  )}
                </span>
                <div className="-mt-0.5">
                  <p
                    className={`text-sm font-semibold ${
                      stage.state === "todo" ? "text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="text-xs text-slate-500">{stage.note}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Floating notification */}
      <div className="relative -mt-6 ml-auto mr-2 flex w-[88%] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg shadow-emerald-900/10 sm:absolute sm:-bottom-6 sm:-left-6 sm:mt-0 sm:mr-0 sm:ml-0 sm:w-72">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Icon className="h-4.5 w-4.5">
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
  );
}

function FaqItem({ faq, id, isOpen, onToggle }) {
  return (
    <div className="border-b border-slate-200 first:border-t">
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
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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
          <p className="max-w-xl pb-5 text-sm leading-7 text-slate-600">{faq.answer}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Landing() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen scroll-smooth bg-white font-sans text-slate-900 antialiased">


      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className={`${container} flex h-16 items-center justify-between gap-6`}>
          <Link
            to="/"
            className={`flex shrink-0 items-center gap-2.5 rounded-md ${focusRing}`}
            aria-label="BantaySerbisyo home"
          >
            <img
              src={tagoloanSeal}
              alt="Official Seal of Tagoloan"
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="text-lg font-bold tracking-tight">
              Bantay<span className="font-semibold text-emerald-800">Serbisyo</span>
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
                className={`rounded-md px-3.5 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className={`hidden rounded-md px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-emerald-800 sm:block ${focusRing}`}
            >
              Log in
            </Link>
            <Link
              to="/login"
              className={`rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 ${focusRing}`}
            >
              Get started
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <nav
          aria-label="Section navigation"
          className="flex justify-center gap-1 border-t border-slate-100 px-4 py-1.5 text-xs font-medium text-slate-600 md:hidden"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 hover:bg-slate-100 ${focusRing}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section id="home" className="scroll-mt-16 overflow-hidden bg-white">
          <div
            className={`${container} grid items-center gap-16 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-28`}
          >
            <div>
              <h1 className="max-w-xl text-4xl leading-[1.1] font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]">
                Report community concerns and see them through.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
                BantaySerbisyo lets you send a complaint to your local government,
                then follow each step until it is resolved.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className={`inline-flex items-center justify-center rounded-md bg-emerald-800 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-900 ${focusRing}`}
                >
                  Submit a complaint
                </Link>
                <a
                  href="#how-it-works"
                  className={`inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 ${focusRing}`}
                >
                  See how it works
                </a>
              </div>

              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
                {["Free for citizens", "Sign in with Google", "Track every update"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="pb-8 sm:pb-6 lg:pl-6">
              <TrackerMockup />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className={`${sectionSpace} border-y border-slate-200 bg-slate-50`}>
          <div className={container}>
            <SectionHeading
              title="Public service, made easier"
              description="A direct line between residents and the people responsible for addressing their concerns."
            />

            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="bg-white p-8 sm:p-10">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
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
        <section id="how-it-works" className={`${sectionSpace} bg-white`}>
          <div className={container}>
            <SectionHeading
              title="How BantaySerbisyo works"
              description="Three steps from sign-in to a resolved concern."
            />

            <ol className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
              <div
                aria-hidden="true"
                className="absolute top-6 right-[16.66%] left-[16.66%] hidden h-px bg-slate-200 md:block"
              />
              {steps.map((step, i) => (
                <li key={step.title} className="relative text-center">
                  <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-base font-semibold text-emerald-800 ring-8 ring-white">
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
            <div className="mt-24 flex flex-col items-start justify-between gap-8 rounded-2xl bg-emerald-950 px-8 py-12 sm:px-12 md:flex-row md:items-center">
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
                className="inline-flex shrink-0 items-center justify-center rounded-md bg-white px-6 py-3.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950"
              >
                Submit a complaint
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`${sectionSpace} border-t border-slate-200 bg-slate-50`}>
          <div className={`${container} grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20`}>
            <SectionHeading
              align="left"
              title="Frequently asked questions"
              description="Quick answers about submitting and tracking complaints."
            />

            <div>
              {faqs.map((faq, index) => (
                <FaqItem
                  key={faq.question}
                  id={index}
                  faq={faq}
                  isOpen={openFaq === index}
                  onToggle={() => setOpenFaq(openFaq === index ? null : index)}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950">
        <div
          className={`${container} flex flex-col items-center justify-between gap-5 py-10 text-center md:flex-row md:text-left`}
        >
          <Link to="/" className={`flex items-center gap-2.5 rounded-md ${focusRing}`}>
            <img
              src={tagoloanSeal}
              alt="Official Seal of Tagoloan"
              className="h-9 w-9 object-contain"
            />
            <span className="text-base font-bold text-white">
              Bantay<span className="font-semibold text-emerald-300">Serbisyo</span>
            </span>
          </Link>

          <p className="max-w-sm text-sm leading-6 text-emerald-100/70">
            Making local public service more accessible and transparent.
          </p>

          <span className="text-xs text-emerald-100/50">
            © {new Date().getFullYear()} BantaySerbisyo
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
