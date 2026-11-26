import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import tagoloanSeal from "../../assets/System_Logo.png";

export const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2";

export const focusRingLight =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950";

export const inputBase =
    "block min-h-12 w-full rounded-xl border bg-white/90 px-3.5 py-3 text-base text-slate-900 shadow-sm outline-none backdrop-blur-md transition placeholder:text-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 sm:text-sm";

export const inputOk =
    "border-slate-400 hover:border-slate-500 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/15";

export const inputBad =
    "border-red-600 focus:border-red-600 focus:ring-4 focus:ring-red-600/15";

export function Spinner({ className = "h-4 w-4" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`${className} animate-spin motion-reduce:animate-none`}
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
            />
            <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function Field({ id, label, error, hint, children }) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-medium text-slate-900"
            >
                {label}
            </label>

            {children}

            {hint && !error && (
                <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-600">
                    {hint}
                </p>
            )}

            {error && (
                <p
                    id={`${id}-error`}
                    className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700"
                >
                    <svg
                        viewBox="0 0 24 24"
                        className="mt-0.5 h-4 w-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7.5v5M12 16.2v.1" strokeLinecap="round" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

export function PasswordInput({
    id,
    inputRef,
    value,
    onChange,
    placeholder,
    autoComplete,
    disabled,
    error,
}) {
    const [visible, setVisible] = useState(false);
    const [capsOn, setCapsOn] = useState(false);

    const describedBy =
        [error ? `${id}-error` : null, capsOn ? `${id}-caps` : null]
            .filter(Boolean)
            .join(" ") || undefined;

    function trackCapsLock(event) {
        setCapsOn(event.getModifierState?.("CapsLock") ?? false);
    }

    return (
        <>
            <div className="relative">
                <input
                    ref={inputRef}
                    id={id}
                    type={visible ? "text" : "password"}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onKeyDown={trackCapsLock}
                    onKeyUp={trackCapsLock}
                    onBlur={() => setCapsOn(false)}
                    autoComplete={autoComplete}
                    disabled={disabled}
                    aria-invalid={error ? "true" : undefined}
                    aria-describedby={describedBy}
                    className={`${inputBase} pr-20 ${error ? inputBad : inputOk}`}
                />

                <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    disabled={disabled}
                    className={`absolute inset-y-0 right-0 my-1 mr-1 min-w-16 rounded-full px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-emerald-900 disabled:opacity-50 ${focusRing}`}
                >
                    {visible ? "Hide" : "Show"}
                </button>
            </div>

            {capsOn && (
                <p
                    id={`${id}-caps`}
                    role="status"
                    className="mt-1.5 text-sm font-medium text-slate-700"
                >
                    Caps Lock is on.
                </p>
            )}
        </>
    );
}

export function Notice({ notice, onDismiss }) {
    if (!notice) return null;

    const isError = notice.type === "error";

    return (
        <div
            role={isError ? "alert" : "status"}
            className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                isError
                    ? "border-red-300 bg-red-50 text-red-900"
                    : "border-emerald-300 bg-emerald-50 text-emerald-950"
            }`}
        >
            <p className="flex-1">{notice.text}</p>

            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss message"
                className={`-mt-1 -mr-2 flex h-9 w-9 items-center justify-center rounded-full text-lg opacity-70 transition-opacity hover:opacity-100 ${focusRing}`}
            >
                <span aria-hidden="true">×</span>
            </button>
        </div>
    );
}

/*
| Hides an inactive section from keyboard and screen readers.
| `inert` is set through a ref so it works in React 18 and 19.
*/
export function Pane({ active, className = "", children }) {
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.inert = !active;
        }
    }, [active]);

    return (
        <div ref={ref} aria-hidden={!active} className={className}>
            {children}
        </div>
    );
}

/*
| Always-visible account type switch (recognition over recall).
| Shown on every screen size, in the same position on both forms.
*/
export function AccountSwitch({ mode, onChange, disabled }) {
    const options = [
        { value: "citizen", label: "Citizen" },
        { value: "personnel", label: "LGU personnel" },
    ];

    return (
        <div
            className="glass-soft mb-8 grid grid-cols-2 gap-1 rounded-full p-1"
            role="group"
            aria-label="Account type"
        >
            {options.map((option) => {
                const selected = mode === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        disabled={disabled}
                        aria-pressed={selected}
                        className={`min-h-11 rounded-full px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
                            selected
                                ? "glass-btn-primary"
                                : "glass-hover text-slate-700 hover:text-slate-900"
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/* Header, main landmark and footer shared by both form halves. */
export function FormShell({ mainId, children }) {
    return (
        <>
            <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
                <Link
                    to="/"
                    className={`flex items-center gap-2.5 rounded-full lg:invisible ${focusRing}`}
                    aria-label="BantaySerbisyo home"
                >
                    <img
                        src={tagoloanSeal}
                        alt="Official Seal of Tagoloan"
                        className="h-9 w-9 object-contain"
                    />
                    <span className="text-lg font-bold tracking-tight">
                        Bantay
                        <span className="font-semibold text-emerald-800">
                            Serbisyo
                        </span>
                    </span>
                </Link>

                <Link
                    to="/"
                    className={`glass-btn-secondary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium text-slate-700 ${focusRing}`}
                >
                    Back to home
                </Link>
            </header>

            <main
                id={mainId}
                tabIndex={-1}
                className="flex flex-1 items-center justify-center px-6 pt-4 pb-12 outline-none sm:px-10"
            >
                <section
                    aria-labelledby={`${mainId}-title`}
                    className="glass w-full max-w-md rounded-3xl p-6 sm:p-8"
                >
                    {children}
                </section>
            </main>

            <footer className="px-6 py-6 text-center text-xs text-slate-600 sm:px-10">
                © {new Date().getFullYear()} BantaySerbisyo · Municipality of
                Tagoloan
            </footer>
        </>
    );
}

