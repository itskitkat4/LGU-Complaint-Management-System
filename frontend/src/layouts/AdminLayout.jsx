import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../context/ThemeContext";
import NotificationBell from "../components/NotificationBell";
import { confirmAndSignOut } from "../lib/signOut";

const navigation = [
  { label: "Overview", icon: "grid", path: "/admin/dashboard" },
  { label: "Complaints", icon: "message", path: "/admin/complaints" },
  { label: "User Management", icon: "users", path: "/admin/users" },
  { label: "Barangays", icon: "map", path: "/admin/barangays" },
  { label: "Departments", icon: "building", path: "/admin/departments" },
  { label: "Settings", icon: "settings", path: "/admin/settings" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

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
    message: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  };

  return <svg {...common}>{paths[name] || null}</svg>;
}

function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="glass-icon flex h-10 w-10 items-center justify-center rounded-xl"><Icon name="shield" /></span>
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
        active ? "glass-active text-emerald-900" : "glass-hover text-slate-600"
      }`}>
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export default function AdminLayout({
  title = "Admin Dashboard",
  profile,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const handleSignOut = () => confirmAndSignOut(navigate);
  const displayName =
    profile?.full_name || profile?.name || profile?.email?.split("@")[0] || "Administrator";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="app-bg min-h-screen font-sans text-slate-900 antialiased">
      <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-64 flex-col rounded-3xl lg:flex">
        <Link to="/admin/dashboard" className={`m-4 rounded-xl p-2 ${focusRing}`}><Logo /></Link>
        <div className="px-6 pb-3 pt-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Administration</p></div>
        <nav className="space-y-1 px-4">
          {navigation.map(item => <SidebarLink key={item.path} item={item} />)}
        </nav>

        <div className="mt-auto p-3">
          <div className="glass-soft rounded-2xl p-3">
            <div className="mb-2 flex items-center gap-3 px-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">{firstName.charAt(0).toUpperCase()}</span>
              <span className="min-w-0">
                <span className="block text-xs text-slate-500">System Administrator</span>
              </span>
            </div>
            <button onClick={handleSignOut} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 ${focusRing}`}>
              <Icon name="logout" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(value => !value)} className={`glass rounded-xl p-2 text-slate-600 lg:hidden ${focusRing}`} aria-label="Toggle navigation" aria-expanded={mobileMenuOpen}>
              <Icon name="menu" />
            </button>
            <Link to="/admin/dashboard" className="lg:hidden"><Logo /></Link>
            <div className="glass hidden items-center gap-3 rounded-full py-1.5 pl-2 pr-5 lg:flex">
              <span className="glass-icon flex h-9 w-9 items-center justify-center rounded-full"><Icon name="home" className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-medium leading-4 text-slate-500">System Administrator</p>
                <h1 className="text-sm font-semibold leading-4">{title}</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <div className="glass hidden items-center gap-2 rounded-full py-1 pl-1 pr-4 lg:flex">
              <span className="glass-icon flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">{firstName.charAt(0).toUpperCase()}</span>
              <span className="text-sm font-medium text-slate-700">{firstName}</span>
            </div>
            <button onClick={handleSignOut} className={`glass-btn-secondary rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 lg:hidden ${focusRing}`}>Sign Out</button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="glass mx-5 mb-2 rounded-2xl p-4 sm:mx-8 lg:hidden">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Administration</p>
            <nav className="grid grid-cols-2 gap-2">
              {navigation.map(item => <SidebarLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />)}
            </nav>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-5 pb-5 pt-2 sm:px-8 sm:pb-8">
          {children}
          <footer className="flex items-center gap-4 py-5 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-400/30" aria-hidden="true" />
            <span>© {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan</span>
            <span className="h-px flex-1 bg-slate-400/30" aria-hidden="true" />
          </footer>
        </main>
      </div>
    </div>
  );
}