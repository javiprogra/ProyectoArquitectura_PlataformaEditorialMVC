import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EditorialHeader } from '../components/EditorialHeader';
import { EditorialFooter } from '../components/EditorialFooter';
import { OrderSummary } from '../components/OrderSummary';
import { useCart } from '../context/CartContext';
import { mockService } from '../services/mockService';
import type { Book, Order, OrderCalculation } from '../services/mockService';
import { formatDate, formatQ } from '../utils/format';
import { getCurrentRole, getCurrentUser } from '../utils/session';

interface CheckoutForm {
  fullName: string;
  email: string;
  nit: string;
  phone: string;
  address: string;
  deliveryMethod: string;
  paymentMethod: string;
  notes: string;
  cardHolder: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
}

const deliveryLabels: Record<string, string> = {
  entrega_domicilio: 'Entrega a domicilio',
  retiro_sede: 'Retiro en sede Quetzaltenango',
  envio_institucional: 'Envío institucional consolidado',
};

const paymentLabels: Record<string, string> = {
  tarjeta: 'Tarjeta de crédito / débito',
  transferencia: 'Transferencia bancaria',
  credito_institucional: 'Crédito institucional',
  efectivo: 'Pago contra entrega',
};

export default function Checkout() {
  const { items, clearCart } = useCart();
  const role = getCurrentRole();
  const user = getCurrentUser();

  const [books, setBooks] = useState<Book[]>([]);
  const [summary, setSummary] = useState<OrderCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  const [form, setForm] = useState<CheckoutForm>(() => ({
    fullName: user?.name ?? '',
    email: user?.email ?? '',
    nit: '',
    phone: '',
    address: '',
    deliveryMethod: 'entrega_domicilio',
    paymentMethod: 'tarjeta',
    notes: '',
    cardHolder: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
  }));
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    let isMounted = true;
    // TODO: Conectar con el Controlador/Backend → GET /api/books
    mockService.getBooks().then((data) => {
      if (!isMounted) return;
      setBooks(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setSummary(null);
      setCalculating(false);
      return;
    }

    let isMounted = true;
    setCalculating(true);
    // TODO: Conectar con el Controlador/Backend → POST /api/orders/calculate
    mockService.calculateOrder(items, role).then((data) => {
      if (!isMounted) return;
      setSummary(data);
      setCalculating(false);
    });

    return () => {
      isMounted = false;
    };
  }, [items, role]);

  const detailedItems = useMemo(
    () =>
      items.flatMap((item) => {
        const book = books.find((candidate) => candidate.id === item.bookId);
        return book ? [{ item, book }] : [];
      }),
    [items, books],
  );

  const updateField = (field: keyof CheckoutForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!summary || items.length === 0) return;

    setPaymentError('');
    if (form.paymentMethod === 'tarjeta') {
      const number = form.cardNumber.replace(/\s+/g, '');
      if (
        !form.cardHolder.trim() ||
        number.length < 13 ||
        !/^\d{2}\/\d{2}$/.test(form.cardExpiry) ||
        form.cardCvv.trim().length < 3
      ) {
        setPaymentError('Completa correctamente los datos de la tarjeta.');
        return;
      }
    }

    setSubmitting(true);

    // TODO: Conectar con el Controlador/Backend → POST /api/orders
    const createdOrder = await mockService.createOrder({
      items,
      userRole: role,
      userId: user?.id ?? 0,
      userName: form.fullName || user?.name || 'Cliente invitado',
    });

    setOrder(createdOrder);
    clearCart();
    setSubmitting(false);
  };

  if (order) {
    const invoiceNumber = `FAC-${order.id.toString().padStart(6, '0')}`;
    const maskedCard =
      form.paymentMethod === 'tarjeta' && form.cardNumber.replace(/\s+/g, '').length >= 4
        ? `•••• •••• •••• ${form.cardNumber.replace(/\s+/g, '').slice(-4)}`
        : null;

    return (
      <div className="min-h-screen bg-editorial-light text-editorial-dark flex flex-col">
        <EditorialHeader />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-editorial-primary to-editorial-secondary text-white px-6 md:px-10 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-editorial-accent font-bold">Factura</p>
                <h1 className="text-2xl md:text-3xl font-extrabold mt-1">{invoiceNumber}</h1>
                <p className="text-sm text-gray-200 mt-1">Orden #{order.id.toString().padStart(6, '0')}</p>
              </div>
              <div className="text-left sm:text-right text-sm">
                <p className="font-semibold">LUMINA Editorial</p>
                <p className="text-gray-200">Sede Quetzaltenango</p>
                <p className="text-gray-200 mt-1">Fecha: {formatDate(order.createdAt)}</p>
                <span className="inline-block mt-2 bg-emerald-500/20 text-emerald-100 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-300/40">
                  Pago confirmado
                </span>
              </div>
            </div>

            <div className="p-6 md:p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h2 className="text-xs uppercase tracking-wider font-bold text-editorial-secondary mb-2">Facturar a</h2>
                  <p className="font-semibold text-editorial-primary">{order.userName || form.fullName}</p>
                  <p className="text-sm text-gray-600">{form.email}</p>
                  <p className="text-sm text-gray-600">NIT: {form.nit || 'CF'}</p>
                  <p className="text-sm text-gray-600">Tel.: {form.phone || '—'}</p>
                  <p className="text-sm text-gray-600 mt-1">{form.address || '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <h2 className="text-xs uppercase tracking-wider font-bold text-editorial-secondary mb-2">Detalles de pago</h2>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Método:</span> {paymentLabels[form.paymentMethod] ?? form.paymentMethod}
                  </p>
                  {maskedCard && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Tarjeta:</span> {maskedCard}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Entrega:</span> {deliveryLabels[form.deliveryMethod] ?? form.deliveryMethod}
                  </p>
                  {form.notes && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-semibold">Notas:</span> {form.notes}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-editorial-primary mb-3">Detalle de la compra</h2>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-editorial-beige/60 text-editorial-primary">
                      <tr>
                        <th className="text-left font-semibold px-4 py-3">Descripción</th>
                        <th className="text-center font-semibold px-3 py-3">Cant.</th>
                        <th className="text-right font-semibold px-3 py-3">Precio unit.</th>
                        <th className="text-right font-semibold px-4 py-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {order.items.map((item) => (
                        <tr key={item.bookId}>
                          <td className="px-4 py-3">{item.title}</td>
                          <td className="px-3 py-3 text-center">{item.quantity}</td>
                          <td className="px-3 py-3 text-right">{formatQ(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatQ(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:justify-end">
                <div className="w-full md:w-80 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal base</span>
                    <span className="font-semibold">{formatQ(order.subtotalBase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descuento por volumen ({order.volumeDiscountPercentage}%)</span>
                    <span className="font-semibold text-emerald-700">- {formatQ(order.volumeDiscountAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descuento de cliente ({order.clientDiscountPercentage}%)</span>
                    <span className="font-semibold text-emerald-700">- {formatQ(order.clientDiscountAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Impuestos (IVA 12%)</span>
                    <span className="font-semibold">{formatQ(order.taxes)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-base">
                    <span className="font-bold text-editorial-primary">Total pagado</span>
                    <span className="font-extrabold text-editorial-secondary">{formatQ(order.totalFinal)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-editorial-beige/50 px-4 py-3 text-xs text-gray-600">
                ¡Gracias por tu compra! Esta factura corresponde a una orden registrada en modo demostración. Conserva este comprobante para cualquier consulta.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition"
                >
                  Imprimir factura
                </button>
                <Link
                  to="/catalog"
                  className="text-center border border-editorial-primary/30 text-editorial-primary font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-beige transition"
                >
                  Volver al catálogo
                </Link>
                <Link
                  to="/"
                  className="text-center border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
                >
                  Ir al inicio
                </Link>
              </div>
            </div>
          </div>
        </main>
        <EditorialFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-editorial-light text-editorial-dark flex flex-col">
        <EditorialHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center max-w-lg">
            <h1 className="text-2xl font-bold text-editorial-primary mb-3">No hay ítems para procesar</h1>
            <p className="text-gray-600 mb-6">
              Agrega publicaciones al carrito antes de iniciar el cierre de orden.
            </p>
            <Link
              to="/catalog"
              className="inline-flex bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition"
            >
              Explorar catálogo
            </Link>
          </div>
        </main>
        <EditorialFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-editorial-light text-editorial-dark flex flex-col">
      <EditorialHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-editorial-secondary font-bold">RF-03 · Checkout</p>
          <h1 className="text-3xl font-extrabold text-editorial-primary">Cierre de orden</h1>
          <p className="text-sm text-gray-600 mt-1">
            Completa los datos de entrega y confirma el pago simulado de tu compra.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-editorial-primary mb-4">Datos del cliente</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre completo / Razón social
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">NIT / Documento fiscal</label>
                  <input
                    type="text"
                    value={form.nit}
                    onChange={(event) => updateField('nit', event.target.value)}
                    placeholder="Opcional para minoristas"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de cliente</label>
                  <input
                    type="text"
                    readOnly
                    value={
                      role === 'institutional_client'
                        ? 'Institucional · 8% de descuento adicional'
                        : 'Minorista / Visitante · sin descuento adicional'
                    }
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección de entrega</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    placeholder="Calle, zona, municipio y departamento"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-editorial-primary mb-4">Entrega y pago</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Método de entrega</label>
                  <select
                    value={form.deliveryMethod}
                    onChange={(event) => updateField('deliveryMethod', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  >
                    <option value="entrega_domicilio">Entrega a domicilio</option>
                    <option value="retiro_sede">Retiro en sede Quetzaltenango</option>
                    <option value="envio_institucional">Envío institucional consolidado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Método de pago</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(event) => updateField('paymentMethod', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  >
                    <option value="tarjeta">Tarjeta de crédito / débito</option>
                    <option value="transferencia">Transferencia bancaria</option>
                    <option value="credito_institucional">Crédito institucional</option>
                    <option value="efectivo">Pago contra entrega</option>
                  </select>
                </div>

                {form.paymentMethod === 'tarjeta' && (
                  <div className="sm:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-sm font-bold text-editorial-primary mb-3">Datos de la tarjeta</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del titular</label>
                        <input
                          type="text"
                          value={form.cardHolder}
                          onChange={(event) => updateField('cardHolder', event.target.value)}
                          placeholder="Como aparece en la tarjeta"
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                          required={form.paymentMethod === 'tarjeta'}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Número de tarjeta</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={19}
                          value={form.cardNumber}
                          onChange={(event) => updateField('cardNumber', event.target.value)}
                          placeholder="1234 5678 9012 3456"
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                          required={form.paymentMethod === 'tarjeta'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de expiración</label>
                        <input
                          type="text"
                          maxLength={5}
                          value={form.cardExpiry}
                          onChange={(event) => updateField('cardExpiry', event.target.value)}
                          placeholder="MM/AA"
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                          required={form.paymentMethod === 'tarjeta'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">CVV</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          value={form.cardCvv}
                          onChange={(event) => updateField('cardCvv', event.target.value)}
                          placeholder="123"
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                          required={form.paymentMethod === 'tarjeta'}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones de la orden</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) => updateField('notes', event.target.value)}
                    placeholder="Instrucciones de facturación, horarios de entrega, referencias..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                {paymentError && (
                  <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {paymentError}
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-editorial-primary mb-4">Obras de la orden</h2>
              <ul className="divide-y divide-gray-100">
                {detailedItems.map(({ item, book }) => (
                  <li key={item.bookId} className="py-3 flex items-center gap-3">
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="h-16 w-11 rounded object-cover border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-editorial-primary truncate">{book.title}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatQ(book.price)}
                      </p>
                    </div>
                    <span className="font-bold text-editorial-secondary whitespace-nowrap">
                      {formatQ(book.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="lg:sticky lg:top-6 space-y-4">
            <OrderSummary summary={summary} calculating={calculating} />

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
              <button
                type="submit"
                disabled={submitting || calculating || !summary}
                className="w-full bg-editorial-primary text-white font-bold px-5 py-3 rounded-lg shadow hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Procesando orden...' : 'Confirmar y pagar'}
              </button>
              <Link
                to="/cart"
                className="block text-center font-semibold px-5 py-2.5 rounded-lg border border-editorial-primary/30 text-editorial-primary hover:bg-editorial-beige transition"
              >
                Volver al carrito
              </Link>
              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                Al confirmar se registrará una orden simulada. La integración con la pasarela de pago y el controlador de
                órdenes queda pendiente.
              </p>
            </div>
          </div>
        </form>
      </main>

      <EditorialFooter />
    </div>
  );
}
