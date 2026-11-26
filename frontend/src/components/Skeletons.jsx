export function SkeletonBlock({ className = "" }) {
  return <div aria-hidden="true" className={`liquid-skeleton ${className}`} />;
}

export function ContentSkeleton({ label = "Loading content", variant = "list", rows = 3, className = "" }) {
  const count = Array.from({ length: rows });

  return (
    <div role="status" aria-label={label} className={`space-y-4 ${className}`}>
      <span className="sr-only">{label}...</span>
      {variant === "table" ? (
        <div aria-hidden="true" className="glass overflow-hidden rounded-2xl p-4 sm:p-5">
          <div className="mb-5 flex gap-4 border-b border-white/40 pb-4">
            {["w-1/4", "w-1/3", "w-1/5", "w-1/6"].map((width, index) => (
              <SkeletonBlock key={index} className={`h-4 ${width}`} />
            ))}
          </div>
          <div className="space-y-4">
            {count.map((_, row) => (
              <div key={row} className="flex items-center gap-4">
                {["w-1/4", "w-1/3", "w-1/5", "w-1/6"].map((width, col) => (
                  <SkeletonBlock key={col} className={`h-4 ${width}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : variant === "form" ? (
        <div aria-hidden="true" className="glass rounded-2xl p-5 sm:p-7">
          <SkeletonBlock className="mb-6 h-6 w-2/5" />
          <div className="grid gap-5 sm:grid-cols-2">
            {count.map((_, row) => (
              <div key={row} className={row === rows - 1 && rows % 2 ? "sm:col-span-2" : ""}>
                <SkeletonBlock className="mb-2 h-4 w-1/3" />
                <SkeletonBlock className={`h-11 w-full ${row === rows - 1 && rows % 2 ? "h-28" : ""}`} />
              </div>
            ))}
          </div>
          <SkeletonBlock className="mt-6 h-11 w-36" />
        </div>
      ) : (
        <div aria-hidden="true" className="space-y-3">
          {count.map((_, row) => (
            <div key={row} className="glass flex items-start gap-4 rounded-2xl p-5">
              <SkeletonBlock className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-3">
                <SkeletonBlock className="h-4 w-2/5" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
