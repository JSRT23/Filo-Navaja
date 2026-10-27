import { forwardRef, useId } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-sm border border-line-strong bg-white px-3 text-[0.95rem] text-ink placeholder:text-ink-mute/80 transition-colors focus:border-cordovan-600 focus:outline-none focus:ring-3 focus:ring-brass-300/40 disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-mute aria-[invalid=true]:border-pole-500 aria-[invalid=true]:focus:ring-pole-100';

export function Label({ htmlFor, children, optional, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-sm font-medium text-ink', className)}>
      {children}
      {optional && <span className="ml-1 font-normal text-ink-mute">(opcional)</span>}
    </label>
  );
}

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-pole-600">
      {children}
    </p>
  );
}

export function Hint({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-ink-mute">
      {children}
    </p>
  );
}

/**
 * Campo con etiqueta, ayuda y error. El hijo recibe id y aria-* automáticamente
 * si se pasa como función: <Field label="…">{(p) => <Input {...p} />}</Field>
 */
export function Field({ label, hint, error, optional, className, children, id: idProp }) {
  const auto = useId();
  const id = idProp || auto;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const props = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} optional={optional}>
          {label}
        </Label>
      )}
      {typeof children === 'function' ? children(props) : children}
      {error ? <FieldError id={errorId}>{error}</FieldError> : <Hint id={hintId}>{hint}</Hint>}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, 'h-11', className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(control, 'resize-y py-2.5 leading-relaxed', className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'h-11 cursor-pointer appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
    </div>
  );
});

export const Checkbox = forwardRef(function Checkbox({ className, label, description, id: idProp, ...props }, ref) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3', className)}>
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-xs border border-line-strong bg-white transition-colors checked:border-cordovan-800 checked:bg-cordovan-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500"
          {...props}
        />
        <Check
          aria-hidden
          className="pointer-events-none absolute size-3.5 text-bone-50 opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
        />
      </span>
      <span className="text-sm leading-snug">
        <span className="text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-ink-mute">{description}</span>}
      </span>
    </label>
  );
});

export function Switch({ checked, onChange, label, description, disabled, id: idProp, className }) {
  const auto = useId();
  const id = idProp || auto;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {(label || description) && (
        <label htmlFor={id} className="cursor-pointer text-sm">
          <span className="font-medium text-ink">{label}</span>
          {description && <span className="mt-0.5 block text-ink-mute">{description}</span>}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-sinu-500' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

/** Control segmentado (pestañas compactas) */
export function Segmented({ value, onChange, options, className, size = 'md', tone = 'light', 'aria-label': ariaLabel }) {
  const dark = tone === 'dark';
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex max-w-full overflow-x-auto rounded-md border p-0.5 scrollbar-none',
        dark ? 'border-bone-100/15 bg-cordovan-950/60' : 'border-line bg-paper',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-sm font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active
                ? dark
                  ? 'bg-bone-50 text-cordovan-950'
                  : 'bg-white text-ink shadow-card'
                : dark
                  ? 'text-bone-100/70 hover:text-bone-50'
                  : 'text-ink-soft hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
