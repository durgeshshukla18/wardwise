type Props<T extends string | number | boolean> = {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
};

/** A row of exclusive choices, such as A1 or A2, or On and Off. Each one is at least 44 px. */
export function Segmented<T extends string | number | boolean>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-control border border-line bg-surface"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={`min-h-touch flex-1 px-12 text-16 transition-colors duration-150 ease-out first:rounded-l-control last:rounded-r-control ${
              checked ? 'bg-primary-tint font-semibold text-primary' : 'text-ink hover:bg-paper'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
