import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Ventana modal accesible (foco atrapado, Esc, lectura de pantalla).
 * En móvil se muestra como hoja inferior.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  hideClose = false,
  tone = 'light',
}) {
  const dark = tone === 'dark';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-cordovan-950/55 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
              <Dialog.Content asChild forceMount>
                <motion.div
                  className={cn(
                    'pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl shadow-pop sm:rounded-xl',
                    dark ? 'bg-cordovan-900 text-bone-50' : 'bg-white text-ink',
                    SIZES[size],
                    className,
                  )}
                  initial={{ opacity: 0, y: 28, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 18, scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
                >
                  {(title || !hideClose) && (
                    <div className={cn('flex items-start justify-between gap-4 px-6 pt-5', !title && 'absolute right-0 top-0 z-10')}>
                      {title ? (
                        <div className="min-w-0 pb-1">
                          <Dialog.Title className="semi-condensed text-xl font-bold leading-tight">{title}</Dialog.Title>
                          {description ? (
                            <Dialog.Description className={cn('mt-1 text-sm', dark ? 'text-bone-100/70' : 'text-ink-soft')}>
                              {description}
                            </Dialog.Description>
                          ) : (
                            <Dialog.Description className="sr-only">{title}</Dialog.Description>
                          )}
                        </div>
                      ) : (
                        <>
                          <Dialog.Title className="sr-only">Detalle</Dialog.Title>
                          <Dialog.Description className="sr-only">Detalle</Dialog.Description>
                        </>
                      )}
                      {!hideClose && (
                        <Dialog.Close
                          aria-label="Cerrar"
                          className={cn(
                            '-mr-2 grid size-9 shrink-0 place-items-center rounded-sm transition-colors',
                            dark
                              ? 'text-bone-100/70 hover:bg-bone-100/10 hover:text-bone-50'
                              : 'text-ink-mute hover:bg-paper hover:text-ink',
                            !title && 'mr-3 mt-3 bg-white/80 backdrop-blur',
                          )}
                        >
                          <X className="size-5" />
                        </Dialog.Close>
                      )}
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">{children}</div>
                  {footer && (
                    <div
                      className={cn(
                        'flex flex-wrap items-center justify-end gap-2 border-t px-6 py-4',
                        dark ? 'border-bone-100/10' : 'border-line bg-paper/60',
                      )}
                    >
                      {footer}
                    </div>
                  )}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/** Confirmación de acciones con consecuencias */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  tone = 'danger',
  loading,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'dark'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-soft">{children}</div>
    </Modal>
  );
}

/** Panel lateral (detalle de cliente, menú móvil del panel) */
export function Drawer({ open, onOpenChange, title, children, side = 'right', className, width = 'max-w-md', footer }) {
  const fromX = side === 'right' ? '100%' : '-100%';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-cordovan-950/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.aside
                className={cn(
                  'fixed inset-y-0 z-50 flex w-full flex-col bg-white shadow-pop',
                  side === 'right' ? 'right-0' : 'left-0',
                  width,
                  className,
                )}
                initial={{ x: fromX }}
                animate={{ x: 0 }}
                exit={{ x: fromX }}
                transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              >
                <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                  <Dialog.Title className="semi-condensed text-lg font-bold">{title}</Dialog.Title>
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                  <Dialog.Close
                    aria-label="Cerrar"
                    className="-mr-2 grid size-9 place-items-center rounded-sm text-ink-mute hover:bg-paper hover:text-ink"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t border-line bg-paper/60 px-5 py-4">{footer}</div>}
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
