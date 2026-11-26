import { Link, useLocation, useNavigate } from "react-router-dom";

import { ThemeToggle } from "../context/ThemeContext";
import NotificationBell from "../components/NotificationBell";
import { useAuth } from "../context/AuthContext";
import { confirmAndSignOut } from "../lib/signOut";

import {
    navigation,
    focusRing,
    Icon,
    Logo,
} from "./citizenLayoutUtils";

export default function CitizenLayout({
    title = "Dashboard",
    profile,
    children,
}) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { profile: authProfile } = useAuth();

    const handleSignOut = () => confirmAndSignOut(navigate, "/");

    // Use the profile passed by the page, otherwise fall back to the signed-in user.
    const currentProfile = profile ?? authProfile;

    const activePath = navigation
        .filter(
            (item) =>
                pathname === item.path ||
                pathname.startsWith(`${item.path}/`)
        )
        .sort((a, b) => b.path.length - a.path.length)[0]?.path;

    const displayName =
        currentProfile?.full_name ||
        currentProfile?.email?.split("@")[0] ||
        "Citizen";

    return (
        <div className="app-bg min-h-screen font-sans text-slate-900 antialiased">
            <div className="flex min-h-screen">
                {/* Desktop Sidebar */}
                <aside className="glass sticky top-4 m-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-3xl lg:flex">
                    <Link
                        to="/citizen/dashboard"
                        className={`m-3 rounded-xl p-2 ${focusRing}`}
                    >
                        <Logo />
                    </Link>

                    <nav
                        aria-label="Main menu"
                        className="mt-1 flex-1 space-y-1 px-3"
                    >
                        {navigation.map((item) => {
                            const active = item.path === activePath;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    aria-current={active ? "page" : undefined}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${focusRing} ${
                                        active
                                            ? "glass-active text-emerald-900"
                                            : "glass-hover text-slate-600"
                                    }`}
                                >
                                    <Icon
                                        name={item.icon}
                                        className="h-[18px] w-[18px]"
                                    />

                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile and Sign Out */}
                    <div className="mt-auto p-3">
                        <div className="glass-soft rounded-2xl p-3">
                            <div className="mb-2 flex items-center gap-3 px-1">
                                <span className="glass-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>

                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">
                                        {displayName}
                                    </p>

                                    <p className="truncate text-xs text-slate-500">
                                        {currentProfile?.email}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleSignOut}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 ${focusRing}`}
                            >
                                <Icon name="logout" />
                                Sign out
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
                    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6">
                        <div className="lg:hidden">
                            <Logo />
                        </div>

                        <p className="glass hidden rounded-full px-5 py-2 text-sm font-semibold lg:block">
                            {title}
                        </p>

                        <div className="flex items-center gap-3">
                            <NotificationBell />
                            <ThemeToggle />

                            <button
                                type="button"
                                onClick={handleSignOut}
                                className={`glass rounded-xl p-2 text-slate-500 lg:hidden ${focusRing}`}
                                aria-label="Sign out"
                            >
                                <Icon name="logout" />
                            </button>
                        </div>
                    </header>

                    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
                        <div className="flex-1 space-y-6">{children}</div>

                        <footer className="mt-6 flex items-center gap-4 py-4 text-xs text-slate-500">
                            <span className="h-px flex-1 bg-slate-400/30" aria-hidden="true" />
                            <span>
                                © {new Date().getFullYear()} BantaySerbisyo ·
                                Municipality of Tagoloan
                            </span>
                            <span className="h-px flex-1 bg-slate-400/30" aria-hidden="true" />
                        </footer>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav
                aria-label="Mobile menu"
                className="glass fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 rounded-2xl p-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
            >
                {navigation.slice(0, 3).map((item) => {
                    const active = item.path === activePath;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            aria-current={active ? "page" : undefined}
                            className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium ${focusRing} ${
                                active
                                    ? "glass-active text-emerald-800"
                                    : "text-slate-500"
                            }`}
                        >
                            <Icon
                                name={item.icon}
                                className="h-5 w-5"
                            />

                            {item.short}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}