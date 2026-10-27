import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Spinner } from './Feedback';

const VARIANTS = {
  primary: 'bg-brass-500 text-cordovan-950 hover:bg-brass-400 active:bg-brass-600 shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)]',
  dark: 'bg-cordovan-900 text-bone-50 hover:bg-cordovan-800 active:bg-cordovan-950',
  outline: 'border border-line-strong bg-white text-ink hover:border-cordovan-600 hover:bg-bone-50',
  ghost: 'text-ink-soft hover:bg-cordovan-900/5 hover:text-ink',
  light: 'border border-bone-100/25 text-bone-50 hover:border-bone-100/60 hover:bg-bone-100/10',
  danger: 'bg-pole-500 text-white hover:bg-pole-600',
  'danger-ghost': 'text-pole-600 hover:bg-pole-50',
  sinu: 'bg-sinu-500 text-white hover:bg-sinu-600',
};

const SIZES = {
  xs: 'h-7 gap-1.5 px-2.5 text-xs rounded-sm',
  sm: 'h-9 gap-2 px-3.5 text-sm rounded-sm',
  md: 'h-11 gap-2 px-5 text-[0.95rem] rounded-md',
  lg: 'h-13 gap-2.5 px-7 text-base rounded-md',
  icon: 'size-9 rounded-sm',
  'icon-sm': 'size-8 rounded-sm',
};

export const buttonClass = ({ variant = 'primary', size = 'md', className } = {}) =>
  cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

export const Button = forwardRef(function Button(
  { variant, size, className, loading = false, disabled, children, type = 'button', to, href, ...props },
  ref,
) {
  const classes = buttonClass({ variant, size, className });
  const content = (
    <>
      {loading && <Spinner className="size-4" />}
      {children}
    </>
  );
  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});

export const IconButton = forwardRef(function IconButton({ label, variant = 'ghost', size = 'icon', className, children, ...props }, ref) {
  return (
    <Button ref={ref} variant={variant} size={size} aria-label={label} title={label} className={className} {...props}>
      {children}
    </Button>
  );
});
