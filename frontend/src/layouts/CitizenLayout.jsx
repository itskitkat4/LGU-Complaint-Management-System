
import { Link, useLocation } from "react-router-dom";

export const navigation = [
  { label: "Overview", short: "Overview", icon: "grid", path: "/citizen/dashboard" },
  { label: "My Complaints", short: "Complaints", icon: "file", path: "/citizen/complaints" },
  { label: "Submit Complaint", short: "Submit", icon: "plus", path: "/citizen/complaints/new" },
  { label: "Notifications", short: "Notifications", icon: "bell", path: "/citizen/notifications" },
  { label: "My Feedback", short: "Feedback", icon: "message", path: "/citizen/feedback" },
  { label: "My Profile", short: "Profile", icon: "user", path: "/citizen/profile" },
  { label: "Help & Support", short: "Help & Support", icon: "help", path: "/citizen/help-support" },
];

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

export function Icon({ name, className = "h-5 w-5" }) {
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
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    progress: <><path d="M21 12a9 9 0 1 1-9-9" /><path d="M12 7v5l3 2" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.5-2.4 2-2.4 3.5" /><path d="M12 17h.01" /></>,
    message: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />,
    pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.01" /></>,
  };

  return <svg {...common}>{paths[name] || paths.file}</svg>;
}

export function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white">
        <Icon name="shield" />
      </span>
      <span>
        <span className="block text-base font-bold tracking-tight text-slate-900">
          Bantay<span className="text-emerald-800">Serbisyo</span>
        </span>
        <span className="block text-xs text-slate-500">Citizen Portal</span>
      </span>
    </span>
  );
}

export function Panel({ title, description, action, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function CitizenLayout({
  title = "Dashboard",
  profile,
  onLogout,
  children,
}) {
  const { pathname } = useLocation();

  const activePath = navigation
    .filter(item => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;

  const displayName =
    profile?.full_name || profile?.email?.split("@")[0] || "Citizen";

  const onSubmitPage = pathname === "/citizen/complaints/new";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <Link to="/citizen/dashboard" className={`m-4 rounded-lg p-2 ${focusRing}`}>
            <Logo />
          </Link>

          <nav aria-label="Main menu" className="mt-2 flex-1 space-y-1 px-4">
            {navigation.map(item => {
              const active = item.path === activePath;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${focusRing} ${
                    active
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-100 p-4">
            <div className="mb-3 flex items-center gap-3 px-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-900">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{profile?.email}</p>
              </div>
            </div>
            <button onClick={onLogout} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 ${focusRing}`}>
              <Icon name="logout" /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
            <div className="lg:hidden"><Logo /></div>
            <p className="hidden text-base font-semibold lg:block">{title}</p>
            <div className="flex items-center gap-3">
              <button onClick={onLogout} className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden ${focusRing}`} aria-label="Sign out">
                <Icon name="logout" />
              </button>
              {!onSubmitPage && (
                <Link to="/citizen/complaints/new" className={`hidden items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 lg:inline-flex ${focusRing}`}>
                  <Icon name="plus" className="h-4 w-4" /> Submit a complaint
                </Link>
              )}
            </div>
          </header>

          <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
            {children}
            <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500">
              © {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan
            </footer>
          </div>
        </main>
      </div>

      <nav aria-label="Mobile menu" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {navigation.slice(0, 3).map(item => {
          const active = item.path === activePath;
          return (
            <Link key={item.path} to={item.path} aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${focusRing} ${
                active ? "text-emerald-800" : "text-slate-500"
              }`}>
              <Icon name={item.icon} className="h-5 w-5" />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
