import { Link, useLocation, useNavigate } from "react-router-dom";

import { ThemeToggle } from "../context/ThemeContext";
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

    const handleSignOut = () => confirmAndSignOut(navigate);

    const activePath = navigation
        .filter(
            (item) =>
                pathname === item.path ||
                pathname.startsWith(`${item.path}/`)
        )
        .sort((a, b) => b.path.length - a.path.length)[0]?.path;

    const displayName =
        profile?.full_name ||
        profile?.email?.split("@")[0] ||
        "Citizen";

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
            <div className="flex min-h-screen">
                {/* Desktop Sidebar */}
                <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
                    <Link
                        to="/citizen/dashboard"
                        className={`m-4 rounded-lg p-2 ${focusRing}`}
                    >
                        <Logo />
                    </Link>

                    <nav
                        aria-label="Main menu"
                        className="mt-2 flex-1 space-y-1 px-4"
                    >
                        {navigation.map((item) => {
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
                    <div className="mt-auto border-t border-slate-100 p-4">
                        <div className="mb-3 flex items-center gap-3 px-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-900">
                                {displayName.charAt(0).toUpperCase()}
                            </span>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                    {displayName}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                    {profile?.email}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSignOut}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 ${focusRing}`}
                        >
                            <Icon name="logout" />
                            Sign out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="min-w-0 flex-1 pb-20 lg:pb-0">
                    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
                        <div className="lg:hidden">
                            <Logo />
                        </div>

                        <p className="hidden text-base font-semibold lg:block">
                            {title}
                        </p>

                        <div className="flex items-center gap-3">
                            <ThemeToggle />

                            <button
                                type="button"
                                onClick={handleSignOut}
                                className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden ${focusRing}`}
                                aria-label="Sign out"
                            >
                                <Icon name="logout" />
                            </button>
                        </div>
                    </header>

                    <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
                        {children}

                        <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500">
                            © {new Date().getFullYear()} BantaySerbisyo ·
                            Municipality of Tagoloan
                        </footer>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav
                aria-label="Mobile menu"
                className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
            >
                {navigation.slice(0, 3).map((item) => {
                    const active = item.path === activePath;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            aria-current={active ? "page" : undefined}
                            className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${focusRing} ${
                                active
                                    ? "text-emerald-800"
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