import { NavLink, Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../context/ThemeContext";
import NotificationBell from "../components/NotificationBell";
import { confirmAndSignOut } from "../lib/signOut";

const navigationByRole = {
  "LGU Staff": [
    { label: "Dashboard", to: "/staff/dashboard", icon: "grid" },
    { label: "Complaint Queue", to: "/staff/complaints", icon: "file" },
    { label: "Complaint History", to: "/staff/complaints/history", icon: "history" },
    { label: "Escalation Requests", to: "/staff/escalations", icon: "inbox" },
    { label: "Resolution Review", to: "/staff/resolutions", icon: "file" },
    { label: "Reports & Analytics", to: "/staff/reports", icon: "chart" },
    { label: "Service Feedback", to: "/staff/feedback", icon: "message" },
  ],
  "Barangay Head": [
    { label: "Dashboard", to: "/barangay/dashboard", icon: "grid" },
    { label: "Assigned Complaints", to: "/barangay/complaints", icon: "file" },
    { label: "Complaint History", to: "/barangay/complaints/history", icon: "history" },
    { label: "Service Feedback", to: "/barangay/feedback", icon: "message" },
  ],
  "Department Head": [
    { label: "Dashboard", to: "/department/dashboard", icon: "grid" },
    { label: "Department Monitoring", to: "/department/monitoring", icon: "chart" },
    { label: "Service Feedback", to: "/department/feedback", icon: "message" },
    { label: "Personnel Directory", to: "/department/personnel", icon: "users" },
    {
      label: "Personnel Assignments",
      to: "/department/assignments",
      icon: "users",
    },
  ],
  "Department Personnel": [
    { label: "Dashboard", to: "/personnel/dashboard", icon: "grid" },
    { label: "My Assignments", to: "/personnel/assignments", icon: "file" },
  ],
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 4h16v12h-4l-2 3h-4l-2-3H4z" />
        <path d="M4 12h4l2 3h4l2-3h4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    message: (
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-5 5" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.file}</svg>;
}

function Logo({ subtitle }) {
  return (
    <span className="flex items-center gap-3">
      <span className="glass-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Icon name="shield" className="h-5 w-5" />
      </span>

      <span className="min-w-0">
        <span className="block text-base leading-5 font-bold tracking-tight text-slate-900">
          Bantay
          <span className="font-semibold text-emerald-800">
            Serbisyo
          </span>
        </span>
        <span className="block truncate text-xs text-slate-500">
          {subtitle}
        </span>
      </span>
    </span>
  );
}

function SidebarLink({ link }) {
  const isDashboard = link.to.endsWith("/dashboard");

  return (
    <NavLink
      to={link.to}
      end={
        isDashboard ||
        link.to === "/staff/complaints" ||
        link.to === "/barangay/complaints"
      }
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${focusRing} ${
          isActive
            ? "glass-active text-emerald-900"
            : "glass-hover text-slate-600 hover:text-slate-900"
        }`
      }
    >
      {link.icon && (
        <Icon name={link.icon} className="h-[18px] w-[18px] shrink-0" />
      )}

      <span className="truncate">{link.label}</span>
    </NavLink>
  );
}

export default function StaffLayout({
  children,
  title = "Complaint Queue",
  role = "LGU Staff",
  links: customLinks,
}) {
  const navigate = useNavigate();
  const links = customLinks ?? navigationByRole[role] ?? [];
  const isReportsPage = title === "Reports & Analytics";
  const isDashboard = (to) => to.endsWith("/dashboard");

  const handleSignOut = () => confirmAndSignOut(navigate);

  return (
<div
  className={`app-bg min-h-screen font-sans text-slate-900 antialiased ${
    isReportsPage ? "reports-print-layout" : ""
  }`}
>      <div className="flex min-h-screen">

        {/* Desktop Sidebar */}
        <aside className="glass sticky top-4 m-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-3xl lg:flex">

          {/* Logo */}
          <Link
            to="/"
            className={`m-4 rounded-xl p-2 ${focusRing}`}
            aria-label="BantaySerbisyo home"
          >
            <Logo subtitle={role} />
          </Link>

          {/* Main Menu */}
          <div className="px-6 pb-3 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Main Menu
            </p>
          </div>

          <nav
            aria-label="Main menu"
            className="flex-1 space-y-1 overflow-y-auto px-4"
          >
            {links.map((link) => (
              <SidebarLink key={link.to} link={link} />
            ))}
          </nav>

          {/* Sign Out - Bottom of Sidebar */}
          <div className="mt-auto p-3">
            <div className="glass-soft rounded-2xl p-2">
              <button
                type="button"
                onClick={handleSignOut}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 ${focusRing}`}
              >
                <Icon name="logout" className="h-[18px] w-[18px]" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">

          {/* Topbar */}
          <header className="sticky top-0 z-20 flex min-h-16 items-center px-5 py-3 sm:px-8">

            {/* Mobile Logo */}
            <Link
              to="/"
              className={`rounded-xl lg:hidden ${focusRing}`}
              aria-label="BantaySerbisyo home"
            >
              <Logo subtitle={role} />
            </Link>

            {/* Desktop Page Title */}
            <div className="glass hidden rounded-full px-5 py-1.5 lg:block">
              <p className="text-xs font-medium leading-4 text-slate-500">
                {role}
              </p>

              <h1 className="text-sm font-semibold leading-5 text-slate-900">
                {title}
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
              <button
                type="button"
                onClick={handleSignOut}
                className={`glass-btn-secondary inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 lg:hidden ${focusRing}`}
                aria-label="Sign out"
              >
                <Icon name="logout" className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>

          </header>

          {/* Page Content */}
          <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-5 pt-2 sm:px-8 sm:pb-8">

            {/* Mobile Page Title */}
            <h1 className="mb-8 text-2xl font-bold tracking-tight text-slate-900 lg:hidden">
              {title}
            </h1>

            {children}

            {/* Footer */}
            <footer className="mt-10 flex items-center gap-4 py-5 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-400/30" aria-hidden="true" />
              <span>© {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan</span>
              <span className="h-px flex-1 bg-slate-400/30" aria-hidden="true" />
            </footer>
          </main>
        </div>
      </div>

      {/* Mobile / Tablet Bottom Navigation */}
      <nav
        aria-label="Mobile main menu"
        className="glass fixed inset-x-3 bottom-3 z-30 flex rounded-2xl p-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={isDashboard(link.to) || link.to === "/staff/complaints"}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium ${focusRing} focus-visible:ring-inset ${
                isActive
                  ? "glass-active text-emerald-800"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            <Icon name={link.icon || "file"} className="h-5 w-5" />

            <span className="max-w-full truncate">
              {link.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}