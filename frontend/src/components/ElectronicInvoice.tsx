import { Link } from 'react-router-dom';
import logoLumina from '../assets/logo.png';
import type { Order } from '../services/mockService';
import { formatQ } from '../utils/format';

interface ElectronicInvoiceProps {
  order: Order;
}

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export function ElectronicInvoice({ order }: ElectronicInvoiceProps) {
  const isInstitutional =
    order.customerType === 'institucional' || order.clientDiscountPercentage > 0;
  const invoiceYear = new Date(order.createdAt).getFullYear();
  const invoiceNumber = `FAC-${invoiceYear}-${order.id.toString().padStart(6, '0')}`;
  const totalUnits = order.items.reduce((total, item) => total + item.quantity, 0);
  const taxableBase =
    order.subtotalBase - order.volumeDiscountAmount - order.clientDiscountAmount;

  return (
    <div className="invoice-page min-h-screen bg-editorial-light text-editorial-dark px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <Link
            to="/catalog"
            className="text-editorial-primary font-semibold text-sm hover:underline"
          >
            &larr; Volver al catálogo
          </Link>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-editorial-primary text-white font-bold px-5 py-2.5 rounded-lg shadow hover:bg-editorial-secondary transition"
            >
              Imprimir / Descargar PDF
            </button>
            <Link
              to="/"
              className="border border-editorial-primary/30 text-editorial-primary font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-beige transition text-center"
            >
              Ir al inicio
            </Link>
          </div>
        </div>

        <article className="print-area bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <header className="bg-editorial-primary text-white px-6 md:px-10 py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-xl p-2 shrink-0">
                <img
                  src={logoLumina}
                  alt="LUMINA Editorial"
                  className="h-14 w-14 md:h-16 md:w-16 object-contain"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-editorial-accent font-bold">
                  LUMINA Editorial
                </p>
                <h1 className="text-xl md:text-2xl font-extrabold leading-tight mt-1">
                  Factura / Comprobante de Venta
                </h1>
                <p className="text-xs text-gray-200 mt-1">
                  {isInstitutional
                    ? 'Cliente Institucional / Mayorista'
                    : 'Cliente Minorista'}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-300">Comprobante</p>
              <p className="font-mono font-bold text-editorial-accent text-lg">{invoiceNumber}</p>
              <p className="text-xs text-gray-300 mt-1">{formatDateTime(order.createdAt)}</p>
            </div>
          </header>

          <div className="px-6 md:px-10 py-6 space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-editorial-beige/60 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                  Datos del cliente
                </p>
                <p className="font-bold text-editorial-primary mt-1">{order.userName}</p>
                {order.customerEmail && (
                  <p className="text-xs text-gray-600">{order.customerEmail}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  NIT: <span className="font-semibold">{order.customerNit || 'CF'}</span>
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                  Datos de la orden
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Orden interna:{' '}
                  <span className="font-mono font-semibold text-editorial-primary">
                    #{order.id.toString().padStart(6, '0')}
                  </span>
                </p>
                <p className="text-xs text-gray-600">
                  Método de pago:{' '}
                  <span className="font-semibold">
                    {order.paymentLabel ?? 'No especificado'}
                  </span>
                </p>
                <p className="text-xs text-gray-600">
                  Entrega:{' '}
                  <span className="font-semibold">
                    {order.deliveryLabel ?? 'No especificado'}
                  </span>
                </p>
                {order.purchaseOrder && (
                  <p className="text-xs text-gray-600">
                    Orden de compra:{' '}
                    <span className="font-mono font-semibold">{order.purchaseOrder}</span>
                  </p>
                )}
              </div>
            </section>

            {order.deliveryAddress && (
              <p className="text-xs text-gray-600">
                <span className="font-bold text-editorial-primary">Dirección de entrega:</span>{' '}
                {order.deliveryAddress}
              </p>
            )}

            <section>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-editorial-primary text-white">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Descripción</th>
                      <th className="text-center font-semibold px-3 py-3">Cant.</th>
                      <th className="text-right font-semibold px-3 py-3">Precio unitario</th>
                      <th className="text-right font-semibold px-4 py-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item) => (
                      <tr key={item.bookId}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-editorial-primary">{item.title}</p>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400">
                            Publicación LUMINA
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center">{item.quantity}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {formatQ(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-editorial-secondary whitespace-nowrap">
                          {formatQ(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex justify-end">
              <div className="w-full sm:w-96 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">
                    Subtotal base ({totalUnits} unidad{totalUnits === 1 ? '' : 'es'})
                  </span>
                  <span className="font-semibold">{formatQ(order.subtotalBase)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-emerald-700">
                  <span>Descuento por volumen ({order.volumeDiscountPercentage}%)</span>
                  <span className="font-semibold">- {formatQ(order.volumeDiscountAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-emerald-700">
                  <span>Descuento de cliente ({order.clientDiscountPercentage}%)</span>
                  <span className="font-semibold">- {formatQ(order.clientDiscountAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">Base imponible</span>
                  <span className="font-semibold">{formatQ(taxableBase)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">Impuestos (IVA 12%)</span>
                  <span className="font-semibold">{formatQ(order.taxes)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-editorial-primary/20 pt-3">
                  <span className="text-base font-bold text-editorial-primary">Total final</span>
                  <span className="text-2xl font-extrabold text-editorial-secondary">
                    {formatQ(order.totalFinal)}
                  </span>
                </div>
                {order.creditLineUsed !== undefined && (
                  <p className="text-[11px] text-gray-500 text-right">
                    Cargado a la línea de crédito institucional autorizada.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-editorial-accent/30 bg-editorial-beige/50 p-4 text-xs text-editorial-primary">
              <p className="font-bold mb-1">Nota comercial</p>
              <p>
                Los descuentos por volumen se aplican según el total de unidades de la orden. Las
                cuentas institucionales acumulan un 8% adicional. El IVA del 12% se calcula sobre la
                base imponible final.
              </p>
            </section>
          </div>

          <footer className="bg-gray-50 border-t border-gray-100 px-6 md:px-10 py-4 text-center text-[11px] text-gray-500">
            <p>LUMINA Editorial · Sede Quetzaltenango · Guatemala</p>
            <p className="mt-1">
              Comprobante electrónico generado automáticamente. Gracias por su compra.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
