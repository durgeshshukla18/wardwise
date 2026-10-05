import { forwardRef, useId, type InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
};

/** A labelled text field. The error, when there is one, is announced to screen readers. */
export const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  { label, error = null, className = '', ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-8">
      <label htmlFor={id} className="text-14 font-medium text-ink-soft">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : errorId}
        className={`h-button w-full rounded-control border bg-surface px-12 text-18 text-ink ${
          error === null ? 'border-line' : 'border-wrong'
        } ${className}`}
        {...rest}
      />
      {error !== null && (
        <p id={errorId} role="alert" className="text-14 text-wrong">
          {error}
        </p>
      )}
    </div>
  );
});
