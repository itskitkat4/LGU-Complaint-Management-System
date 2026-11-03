import { Link } from "react-router-dom";
import CitizenLayout from "../../layouts/CitizenLayout";
import { Icon, primaryBtn, secondaryBtn } from "../../components/ui";

const highlights = [
  { icon: "eye", title: "Transparent", text: "Track updates on every report" },
  { icon: "check", title: "Accessible", text: "Report online, anytime" },
];

export default function Landing() {
  return (
    <CitizenLayout>
      <section className="mx-auto max-w-6xl py-6 sm:py-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
              Your voice matters
            </p>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              A better way to report community concerns.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Use BantaySerbisyo to submit complaints, follow their progress, and share
              feedback about local government services.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/citizen/complaints/new" className={primaryBtn}>
                <Icon name="plus" className="h-4 w-4" />
                Submit a complaint
              </Link>
              <Link to="/citizen/dashboard" className={secondaryBtn}>
                My dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-800 text-white">
              <Icon name="megaphone" className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
              Report. Track. Improve.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep your complaint information organized and check its progress through
              the system.
            </p>

            <div className="mt-6 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-lg bg-slate-50 p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </CitizenLayout>
  );
}