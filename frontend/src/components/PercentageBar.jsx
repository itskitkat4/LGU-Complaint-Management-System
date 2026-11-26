export default function PercentageBar({ percentage, fillClassName = "text-emerald-600" }) {
  const value = Math.min(100, Math.max(0, Number(percentage) || 0));

  return (
    <div
      aria-hidden="true"
      style={{ width: `${value}%` }}
      className={`h-full rounded-full bg-current transition-[width] duration-700 ease-out motion-reduce:transition-none ${fillClassName}`}
    />
  );
}