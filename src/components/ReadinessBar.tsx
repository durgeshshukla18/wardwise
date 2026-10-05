const SEGMENTS = 10;

/** Ten ruled segments, one per 10 percent. Always shown next to the percent as text. */
export function ReadinessBar({ percent }: { percent: number }) {
  const filled = Math.floor(percent / 10);
  return (
    <div className="flex gap-4" aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={`h-8 flex-1 rounded-chip ${index < filled ? 'bg-primary' : 'bg-line'}`}
        />
      ))}
    </div>
  );
}
