import { Printer } from 'lucide-react';
import { PAYMENT } from '@/lib/constants';
import { dateTime, money } from '@/lib/format';
import { RazorMark } from '@/components/brand/Logo';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/** Comprobante interno de la venta (no reemplaza la factura electrónica) */
export function ReceiptModal({ receipt, open, onOpenChange, branch }) {
  if (!receipt) return null;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={`Venta #${receipt.number} registrada`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Nueva venta
          </Button>
          <Button variant="dark" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden /> Imprimir comprobante
          </Button>
        </>
      }
    >
      <div className="print-area mx-auto max-w-xs rounded-md bg-paper px-5 py-6 font-mono text-[0.8rem] leading-relaxed text-ink">
        <div className="text-center font-sans">
          <RazorMark className="mx-auto size-7 text-onyx-800" />
          <p className="display mt-1 text-2xl">Filo &amp; Navaja</p>
          <p className="text-xs text-ink-soft">{branch?.name}</p>
          <p className="text-xs text-ink-soft">{branch?.address}</p>
        </div>
        <div className="my-3 border-t border-dashed border-line-strong" />
        <p>Venta #{receipt.number}</p>
        <p>{dateTime(receipt.date)}</p>
        <p>Cliente: {receipt.customer || 'Consumidor final'}</p>
        <div className="my-3 border-t border-dashed border-line-strong" />
        {receipt.items.map((i, idx) => (
          <div key={idx} className="mb-1">
            <p>{i.description}</p>
            <p className="flex justify-between">
              <span>
                {i.quantity} x {money(i.unit_price)}
                {i.barber ? ` (${i.barber})` : ''}
              </span>
              <span>{money(i.quantity * i.unit_price)}</span>
            </p>
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-line-strong" />
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>{money(receipt.subtotal)}</span>
        </p>
        {Number(receipt.discount) > 0 && (
          <p className="flex justify-between">
            <span>Descuento</span>
            <span>-{money(receipt.discount)}</span>
          </p>
        )}
        <p className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{money(receipt.total)}</span>
        </p>
        <p className="mt-2 flex justify-between">
          <span>{PAYMENT[receipt.payment]}</span>
          <span>{receipt.received ? money(receipt.received) : ''}</span>
        </p>
        {receipt.change > 0 && (
          <p className="flex justify-between">
            <span>Cambio</span>
            <span>{money(receipt.change)}</span>
          </p>
        )}
        <div className="my-3 border-t border-dashed border-line-strong" />
        <p className="text-center font-sans text-xs text-ink-soft">Gracias por venir. Reserva tu próximo turno en línea.</p>
        <p className="mt-1 text-center font-sans text-[0.68rem] text-ink-mute">
          Comprobante interno. La factura electrónica se envía a tu correo si la solicitas.
        </p>
      </div>
    </Modal>
  );
}
