import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "bantayserbisyo-theme";
const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Storage unavailable; fall through to the system preference.
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The selected theme still works for this session when storage is unavailable.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {  
  return useContext(ThemeContext);
}

function SunIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) return null;

  const isDark = context.theme === "dark";
  const label = `Switch to ${isDark ? "light" : "dark"} mode`;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      onClick={context.toggleTheme}
      className={[
        "group relative inline-flex h-9 w-[4.5rem] shrink-0 items-center rounded-full border p-1",
        "transition-colors duration-300 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-white dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-slate-950",
        "border-sky-200 bg-sky-100 hover:bg-sky-200/70",
        "dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80",
      ].join(" ")}
    >
      {/* Resting icons: show the mode you are NOT in */}
      <SunIcon className="absolute left-2.5 h-4 w-4 text-sky-700/60 dark:text-slate-400" />
      <MoonIcon className="absolute right-2.5 h-4 w-4 text-sky-700/60 dark:text-slate-400" />

      {/* Thumb */}
      <span
        className={[
          "relative z-10 grid h-7 w-7 place-items-center rounded-full shadow-md",
          "transition-all duration-300 ease-out motion-reduce:transition-none",
          isDark
            ? "translate-x-[2.125rem] bg-teal-300 text-slate-900"
            : "translate-x-0 bg-amber-400 text-amber-950",
        ].join(" ")}
      >
        {isDark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
      </span>
    </button>
  );
}