import { NavLink, Link } from "react-router-dom";

const defaultLinks = [
  { label: "Dashboard", to: "/staff/dashboard", icon: "grid" },
  { label: "Complaint Queue", to: "/staff/complaints", icon: "file" },
];

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
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    back: <path d="M19 12H5M11 6l-6 6 6 6" />,
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.file}</svg>;
}

function Logo({ subtitle }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white">
        <Icon name="shield" className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-base leading-5 font-bold tracking-tight text-slate-900">
          Bantay<span className="font-semibold text-emerald-800">Serbisyo</span>
        </span>
        <span className="block text-xs text-slate-500">{subtitle}</span>
      </span>
    </span>
  );
}

export default function StaffLayout({
  children,
  title = "Staff Portal",
  role = "LGU Staff",
  links = defaultLinks,
}) {
  const isDashboard = (to) => to.endsWith("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <Link
            to="/"
            className={`m-4 rounded-lg p-2 ${focusRing}`}
            aria-label="BantaySerbisyo home"
          >
            <Logo subtitle={role} />
          </Link>

          <nav aria-label="Main menu" className="mt-2 space-y-1 px-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={isDashboard(link.to)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${focusRing} ${
                    isActive
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {link.icon && <Icon name={link.icon} className="h-[18px] w-[18px]" />}
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-100 p-4">
            <Link
              to="/"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
            >
              <Icon name="back" className="h-[18px] w-[18px]" />
              Back to home
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
            <Link
              to="/"
              className={`rounded-lg lg:hidden ${focusRing}`}
              aria-label="BantaySerbisyo home"
            >
              <Logo subtitle={role} />
            </Link>

            <div className="hidden lg:block">
              <p className="text-xs font-medium text-slate-500">{role}</p>
              <h1 className="text-base leading-5 font-semibold text-slate-900">{title}</h1>
            </div>
          </header>

          <main className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
            {/* On mobile the title moves below the top bar so the logo stays visible */}
            <h1 className="text-2xl font-semibold tracking-tight lg:hidden">{title}</h1>

            {children}

            <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500">
              © {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan
            </footer>
          </main>
        </div>
      </div>

      {/* Bottom navigation (mobile / tablet) */}
      <nav
        aria-label="Main menu"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={isDashboard(link.to)}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition-colors ${focusRing} focus-visible:ring-inset ${
                isActive ? "text-emerald-800" : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            <Icon name={link.icon || "file"} className="h-5 w-5" />
            <span className="max-w-full truncate">{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}