import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EditorialHeader } from '../components/EditorialHeader';
import { EditorialFooter } from '../components/EditorialFooter';
import { OrderSummary } from '../components/OrderSummary';
import { useCart } from '../context/CartContext';
import { mockService } from '../services/mockService';
import type { Book, Order, OrderCalculation } from '../services/mockService';
import { formatQ } from '../utils/format';
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
}

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
  }));

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
    return (
      <div className="min-h-screen bg-editorial-light text-editorial-dark flex flex-col">
        <EditorialHeader />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-16">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 md:p-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
              <span className="text-3xl font-bold text-emerald-700">✓</span>
            </div>
            <p className="text-xs uppercase tracking-widest font-bold text-editorial-secondary">
              Orden registrada
            </p>
            <h1 className="text-3xl font-extrabold text-editorial-primary mt-2">
              ¡Gracias por tu compra!
            </h1>
            <p className="text-gray-600 mt-2">
              La orden{' '}
              <span className="font-mono font-bold text-editorial-primary">
                #{order.id.toString().padStart(6, '0')}
              </span>{' '}
              fue generada correctamente en modo demostración.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="rounded-lg bg-editorial-beige/60 p-4">
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="font-semibold text-editorial-primary">{order.userName}</p>
              </div>
              <div className="rounded-lg bg-editorial-beige/60 p-4">
                <p className="text-xs text-gray-500">Ítems</p>
                <p className="font-semibold text-editorial-primary">
                  {order.items.reduce((total, item) => total + item.quantity, 0)} unidades
                </p>
              </div>
              <div className="rounded-lg bg-editorial-beige/60 p-4">
                <p className="text-xs text-gray-500">Total final</p>
                <p className="font-bold text-editorial-secondary">{formatQ(order.totalFinal)}</p>
              </div>
            </div>

            <div className="mt-6 text-left bg-gray-50 rounded-lg p-4">
              <h2 className="font-bold text-editorial-primary mb-2 text-sm">Detalle de la orden</h2>
              <ul className="divide-y divide-gray-200 text-sm">
                {order.items.map((item) => (
                  <li key={item.bookId} className="py-2 flex justify-between gap-4">
                    <span>
                      {item.quantity} × {item.title}
                    </span>
                    <span className="font-semibold">{formatQ(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              TODO: Conectar con el Controlador/Backend para procesar el pago y enviar la
              confirmación por correo.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/catalog"
                className="bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition"
              >
                Volver al catálogo
              </Link>
              <Link
                to="/"
                className="border border-editorial-primary/30 text-editorial-primary font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-beige transition"
              >
                Ir al inicio
              </Link>
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
            <h1 className="text-2xl font-bold text-editorial-primary mb-3">
              No hay ítems para procesar
            </h1>
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
          <p className="text-xs uppercase tracking-widest text-editorial-secondary font-bold">
            RF-03 · Checkout
          </p>
          <h1 className="text-3xl font-extrabold text-editorial-primary">Cierre de orden</h1>
          <p className="text-sm text-gray-600 mt-1">
            Completa los datos de entrega y confirma el pago simulado de tu compra.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-editorial-primary mb-4">
                Datos del cliente
              </h2>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    NIT / Documento fiscal
                  </label>
                  <input
                    type="text"
                    value={form.nit}
                    onChange={(event) => updateField('nit', event.target.value)}
                    placeholder="Opcional para minoristas"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tipo de cliente
                  </label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Dirección de entrega
                  </label>
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
              <h2 className="text-lg font-bold text-editorial-primary mb-4">
                Entrega y pago
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Método de entrega
                  </label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Método de pago
                  </label>
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
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Observaciones de la orden
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) => updateField('notes', event.target.value)}
                    placeholder="Instrucciones de facturación, horarios de entrega, referencias..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-editorial-primary mb-4">
                Obras de la orden
              </h2>
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
                Al confirmar se registrará una orden simulada. La integración con la pasarela de
                pago y el controlador de órdenes queda pendiente.
              </p>
            </div>
          </div>
        </form>
      </main>

      <EditorialFooter />
    </div>
  );
}
