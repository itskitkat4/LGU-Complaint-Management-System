import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import { Icon, Panel, StatCard, focusRing } from "../../components/ui";

const stats = [
  { label: "Total users", value: "128", description: "All registered accounts", icon: "users", tone: "bg-slate-100 text-slate-700" },
  { label: "Citizens", value: "110", description: "Public portal accounts", icon: "user", tone: "bg-emerald-50 text-emerald-700" },
  { label: "Staff accounts", value: "18", description: "LGU and department staff", icon: "shield", tone: "bg-sky-50 text-sky-700" },
  { label: "Departments", value: "6", description: "Active departments", icon: "building", tone: "bg-amber-50 text-amber-700" },
];

const tools = [
  {
    to: "/admin/users",
    icon: "users",
    title: "User management",
    text: "View user accounts and their roles.",
  },
];

export default function Dashboard() {
  return (
    <StaffLayout title="System Administration" role="System Administrator">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            System overview
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Manage accounts and oversee system administration.
          </p>
        </div>

        <section aria-labelledby="stats-title">
          <h2 id="stats-title" className="sr-only">
            System statistics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            All statistics are placeholders, not live database values.
          </p>
        </section>

        <Panel title="Administration tools" description="Common tasks for system administrators.">
          <div className="-my-2 divide-y divide-slate-100">
            {tools.map((tool) => (
              <Link
                key={tool.to}
                to={tool.to}
                className={`group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3.5 transition-colors hover:bg-slate-50 ${focusRing}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                  <Icon name={tool.icon} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{tool.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{tool.text}</span>
                </span>
                <Icon
                  name="arrow"
                  className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </StaffLayout>
  );
}