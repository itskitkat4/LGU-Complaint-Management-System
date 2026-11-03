
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navigation = [
  { label: "Overview", icon: "grid", path: "/admin/dashboard" },
  { label: "User Management", icon: "users", path: "/admin/users" },
  { label: "Barangays", icon: "map", path: "/admin/barangays" },
  { label: "Departments", icon: "building", path: "/admin/departments" },
  { label: "Reports & Analytics", icon: "chart", path: "/admin/reports" },
  { label: "Settings", icon: "settings", path: "/admin/settings" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2";

function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className, fill: "none", stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
    viewBox: "0 0 24 24", "aria-hidden": true,
  };

  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>,
    building: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 21V9h6v12M7 7h.01M12 7h.01M17 7h.01M7 12h.01M17 12h.01" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-.1-.1-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}

function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white"><Icon name="shield" /></span>
      <span>
        <span className="block text-base font-bold text-slate-900">Bantay<span className="text-emerald-800">Serbisyo</span></span>
        <span className="block text-xs text-slate-500">Admin Portal</span>
      </span>
    </span>
  );
}

function SidebarLink({ item, onClick }) {
  const { pathname } = useLocation();
  const active = pathname === item.path || pathname.startsWith(`${item.path}/`);

  return (
    <Link to={item.path} onClick={onClick} aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${focusRing} ${
        active ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-100"
      }`}>
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export default function AdminLayout({
  title = "Admin Dashboard",
  profile,
  onLogout,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName =
    profile?.full_name || profile?.name || profile?.email?.split("@")[0] || "Administrator";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link to="/admin/dashboard" className={`m-4 rounded-xl p-2 ${focusRing}`}><Logo /></Link>
        <div className="px-5 pb-3 pt-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Administration</p></div>
        <nav className="space-y-1 px-4">
          {navigation.map(item => <SidebarLink key={item.path} item={item} />)}
        </nav>

        <div className="mt-auto border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">{firstName.charAt(0).toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{displayName}</span>
              <span className="block text-xs text-slate-500">System Administrator</span>
            </span>
          </div>
          <button onClick={onLogout} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 ${focusRing}`}>
            <Icon name="logout" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(value => !value)} className={`rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden ${focusRing}`} aria-label="Toggle navigation" aria-expanded={mobileMenuOpen}>
              <Icon name="menu" />
            </button>
            <Link to="/admin/dashboard" className="lg:hidden"><Logo /></Link>
            <div className="hidden lg:block">
              <p className="text-xs font-medium text-slate-500">System Administrator</p>
              <h1 className="text-base font-semibold">{title}</h1>
            </div>
          </div>
          <div className="hidden text-sm text-slate-500 sm:block">
            Welcome, <span className="font-semibold text-slate-800">{firstName}</span>
          </div>
          <button onClick={onLogout} className={`rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 lg:hidden ${focusRing}`}>Sign Out</button>
        </header>

        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white p-4 lg:hidden">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Administration</p>
            <nav className="grid grid-cols-2 gap-2">
              {navigation.map(item => <SidebarLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />)}
            </nav>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-5 sm:p-8">
          {children}
          <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan
          </footer>
        </main>
      </div>
    </div>
  );
}
