import * as DM from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/cn';

export function Menu({ trigger, children, align = 'end', className }) {
  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content
          align={align}
          sideOffset={8}
          className={cn('z-50 min-w-52 overflow-hidden rounded-md border border-line bg-white p-1 text-sm text-ink shadow-pop', className)}
        >
          {children}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function MenuItem({ children, onSelect, icon: Icon, danger, className, asChild }) {
  return (
    <DM.Item
      asChild={asChild}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 outline-none transition-colors data-[highlighted]:bg-paper',
        danger ? 'text-pole-600' : 'text-ink',
        className,
      )}
    >
      {asChild ? (
        children
      ) : (
        <span className="flex items-center gap-2.5">
          {Icon && <Icon className="size-4 text-ink-mute" aria-hidden />}
          {children}
        </span>
      )}
    </DM.Item>
  );
}

export function MenuLabel({ children }) {
  return <DM.Label className="px-2.5 pb-1.5 pt-2 text-xs text-ink-mute">{children}</DM.Label>;
}

export function MenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-line" />;
}
