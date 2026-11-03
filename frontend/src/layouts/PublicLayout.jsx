import { Link } from "react-router-dom";
import tagoloanSeal from "../assets/tagoloan-seal.png";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900 antialiased">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 sm:px-8"
        >
          <Link
            to="/"
            className={`flex shrink-0 items-center gap-2.5 rounded-md ${focusRing}`}
            aria-label="BantaySerbisyo home"
          >
            <img
              src={tagoloanSeal}
              alt="Official Seal of Tagoloan"
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="text-lg font-bold tracking-tight">
              Bantay<span className="font-semibold text-emerald-800">Serbisyo</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className={`rounded-md px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-emerald-800 ${focusRing}`}
            >
              Log in
            </Link>
            <Link
              to="/login"
              className={`rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 ${focusRing}`}
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} BantaySerbisyo · Municipality of Tagoloan
      </footer>
    </div>
  );
}