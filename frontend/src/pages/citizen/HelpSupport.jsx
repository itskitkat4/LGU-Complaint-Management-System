
import { useState } from "react";
import CitizenLayout from "../../layouts/CitizenLayout";

const faqs = [
  {
    question: "How do I submit a complaint?",
    answer:
      "Navigate to Submit Complaint and provide the initial details of your concern. You may also attach supporting photos or evidence. Review the information before submitting your complaint.",
  },
  {
    question: "How can I track my complaint?",
    answer:
      "Go to My Complaints to view all your submitted complaints. Select a complaint to see its details, current status, and available updates.",
  },
  {
    question: "What happens after submitting a complaint?",
    answer:
      "Your complaint will be reviewed by LGU Staff. They will determine whether the concern should be handled at the barangay level or forwarded to the appropriate LGU department.",
  },
  {
    question: "Can I submit evidence with my complaint?",
    answer:
      "Yes. You may attach supporting photos and other available evidence to help the reviewing staff understand and assess your concern.",
  },
  {
    question: "What should I do if my complaint is returned?",
    answer:
      "Check the remarks or instructions provided by the reviewing staff. Follow the instructions and provide any additional information or evidence requested.",
  },
  {
    question: "Can I submit multiple complaints?",
    answer:
      "Yes. You may submit separate complaints for different concerns. Make sure each complaint contains accurate and relevant information.",
  },
];

const statuses = [
  {
    name: "Submitted",
    description:
      "Your complaint has been successfully submitted and is awaiting review.",
    color: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    name: "Under Review",
    description:
      "LGU Staff is reviewing your complaint and determining the appropriate handling process.",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    name: "In Progress",
    description:
      "Your complaint has been assigned to the appropriate handler and action is being taken.",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    name: "Returned",
    description:
      "Additional information, evidence, or action is required.",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    name: "Resolved",
    description:
      "The resolution has been reviewed and approved by LGU Staff.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

const steps = [
  {
    number: "01",
    title: "Submit a Complaint",
    description:
      "Provide the details of your concern and attach supporting evidence if available.",
    icon: "file",
  },
  {
    number: "02",
    title: "Track Your Complaint",
    description:
      "Visit My Complaints to monitor the status and updates of your submission.",
    icon: "search",
  },
  {
    number: "03",
    title: "Review the Resolution",
    description:
      "Check the updates and review the resolution once your complaint is resolved.",
    icon: "check",
  },
];

function SectionHeading({ title, description }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function SupportIcon({ type, className = "h-5 w-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.5-2.4 2-2.4 3.5" />
        <path d="M12 17h.01" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    message: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  };

  return <svg {...common}>{icons[type] || icons.help}</svg>;
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-emerald-800"
      >
        <span className="text-sm font-semibold text-slate-800">
          {question}
        </span>

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-medium transition-colors ${
            open
              ? "bg-emerald-800 text-white"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="pb-4 pr-8">
          <p className="text-sm leading-7 text-slate-500">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpSupport() {
  return (
    <CitizenLayout title="Help & Support">
      <div className="mx-auto max-w-6xl space-y-7">

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-emerald-800">
              BantaySerbisyo
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Help & Support</span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            Help & Support
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Find helpful information and learn how to use BantaySerbisyo
            to submit and monitor your complaints.
          </p>
        </div>

        {/* Support Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-emerald-800 p-6 text-white shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[30px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-emerald-700/60" />

          <div className="relative max-w-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <SupportIcon type="help" className="h-6 w-6" />
            </div>

            <p className="text-sm font-medium text-emerald-100">
              CITIZEN SUPPORT CENTER
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              How can we help you?
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100">
              Get familiar with the complaint process, understand complaint
              statuses, and find answers to frequently asked questions.
            </p>
          </div>
        </section>

        {/* Getting Started */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Getting Started"
            description="Follow these steps when using BantaySerbisyo."
          />

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-wider text-emerald-800">
                    {step.number}
                  </span>

                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <SupportIcon type={step.icon} />
                  </span>
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Complaint Status */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Understanding Complaint Status"
            description="Know what each status means as your complaint progresses."
          />

          <div className="divide-y divide-slate-100">
            {statuses.map((status) => (
              <div
                key={status.name}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="sm:w-36 sm:shrink-0">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${status.color}`}
                  >
                    {status.name}
                  </span>
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  {status.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <SupportIcon type="help" />
            </span>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Frequently Asked Questions
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Find answers to common questions about your account and complaints.
              </p>
            </div>
          </div>

          <div>
            {faqs.map((faq) => (
              <FAQItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </section>

        {/* Contact Support */}
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <SupportIcon type="mail" className="h-6 w-6" />
            </div>

            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900">
                Need Further Assistance?
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                For additional assistance, contact the appropriate LGU office
                through its official communication channels.
              </p>
            </div>

            <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Support Information
            </span>
          </div>
        </section>

      </div>
    </CitizenLayout>
  );
}
