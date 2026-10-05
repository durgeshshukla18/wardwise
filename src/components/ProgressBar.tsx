/** A 4 px bar, teal on the line colour. Drawn in SVG so it needs no inline style. */
export function ProgressBar({ fraction, label }: { fraction: number; label: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <svg
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="block h-4 w-full"
      viewBox="0 0 100 1"
      preserveAspectRatio="none"
    >
      <rect width="100" height="1" className="fill-line" />
      <rect width={percent} height="1" className="fill-primary" />
    </svg>
  );
}
