import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'text';

const base =
  'inline-flex items-center justify-center rounded-control text-16 font-semibold transition-colors duration-150 ease-out';

const variants: Record<Variant, string> = {
  primary: 'h-button w-full bg-primary px-24 text-surface hover:bg-primary-hover tablet:w-auto',
  secondary:
    'h-button w-full border border-line bg-surface px-24 text-ink hover:bg-primary-tint tablet:w-auto',
  text: 'min-h-touch px-8 font-medium text-primary hover:text-primary-hover',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', className = '', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    />
  );
});
