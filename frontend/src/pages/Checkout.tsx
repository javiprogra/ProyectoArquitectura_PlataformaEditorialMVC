import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EditorialHeader } from '../components/EditorialHeader';
import { EditorialFooter } from '../components/EditorialFooter';
import { OrderSummary } from '../components/OrderSummary';
import { CardPaymentGateway, isCardDetailsValid } from '../components/CardPaymentGateway';
import type { CardDetails } from '../components/CardPaymentGateway';
import { ElectronicInvoice } from '../components/ElectronicInvoice';
import { useCart } from '../context/CartContext';
import { mockService } from '../services/mockService';
import type {
  Book,
  CreditValidationResult,
  Order,
  OrderCalculation,
  PaymentMethod,
} from '../services/mockService';
import { formatQ } from '../utils/format';
import { getCurrentRole, getCurrentUser } from '../utils/session';

interface CheckoutForm {
  fullName: string;
  email: string;
  nit: string;
  phone: string;
  address: string;
  deliveryMethod: string;
  paymentMethod: PaymentMethod;
  purchaseOrder: string;
  notes: string;
}

const deliveryLabels: Record<string, string> = {
  entrega_domicilio: 'Entrega a domicilio',
  retiro_sede: 'Retiro en sede Quetzaltenango',
  envio_institucional: 'Envío institucional consolidado',
};

const paymentLabels: Record<PaymentMethod, string> = {
  tarjeta: 'Tarjeta de crédito / débito',
  contra_entrega: 'Pago contra entrega',
  credito_institucional: 'Crédito institucional',
};

const emptyCard: CardDetails = {
  cardNumber: '',
  cardHolder: '',
  expiry: '',
  cvv: '',
};

export default function Checkout() {
  const { items, clearCart } = useCart();
  const role = getCurrentRole();
  const user = getCurrentUser();
  const isInstitutional = role === 'institutional_client';

  const [books, setBooks] = useState<Book[]>([]);
  const [summary, setSummary] = useState<OrderCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [cardDetails, setCardDetails] = useState<CardDetails>(emptyCard);
  const [creditValidation, setCreditValidation] = useState<CreditValidationResult | null>(null);
  const [creditValidating, setCreditValidating] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const [form, setForm] = useState<CheckoutForm>(() => ({
    fullName: user?.name ?? '',
    email: user?.email ?? '',
    nit: user?.nit ?? '',
    phone: '',
    address: '',
    deliveryMethod: 'entrega_domicilio',
    paymentMethod: 'tarjeta',
    purchaseOrder: '',
    notes: '',
  }));

  const paymentOptions = useMemo<
    Array<{ value: PaymentMethod; label: string; description: string }>
  >(
    () =>
      isInstitutional
        ? [
            {
              value: 'tarjeta',
              label: 'Tarjeta de crédito / débito',
              description: 'Pasarela validada con detección Visa / Mastercard.',
            },
            {
              value: 'credito_institucional',
              label: 'Crédito institucional',
              description: 'Cargo a la línea de crédito autorizada con orden de compra.',
            },
          ]
        : [
            {
              value: 'tarjeta',
              label: 'Tarjeta de crédito / débito',
              description: 'Pasarela validada con detección Visa / Mastercard.',
            },
            {
              value: 'contra_entrega',
              label: 'Pago contra entrega',
              description: 'Paga en efectivo al recibir tu pedido en la sede o domicilio.',
            },
          ],
    [isInstitutional],
  );

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

  useEffect(() => {
    setCreditValidation(null);
    setPaymentError('');
  }, [form.paymentMethod, form.purchaseOrder, summary?.totalFinal]);

  const detailedItems = useMemo(
    () =>
      items.flatMap((item) => {
        const book = books.find((candidate) => candidate.id === item.bookId);
        return book ? [{ item, book }] : [];
      }),
    [items, books],
  );

  const updateField = <K extends keyof CheckoutForm,>(field: K, value: CheckoutForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleValidateCredit = async () => {
    if (!summary) return;
    if (!form.purchaseOrder.trim()) {
      setPaymentError('Ingresa el número de orden de compra para validar el crédito.');
      return;
    }

    setPaymentError('');
    setCreditValidating(true);
    // TODO: Conectar con el Controlador/Backend → POST /api/institutional-credit/validate
    const validation = await mockService.validateInstitutionalCredit({
      userId: user?.id ?? 0,
      amount: summary.totalFinal,
      purchaseOrder: form.purchaseOrder.trim(),
    });
    setCreditValidation(validation);
    setCreditValidating(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!summary || items.length === 0) return;

    setPaymentError('');
    setSubmitting(true);

    if (form.paymentMethod === 'tarjeta') {
      if (!isCardDetailsValid(cardDetails)) {
        setPaymentError('Revisa los datos de la tarjeta: número, titular, vencimiento y CVV.');
        setSubmitting(false);
        return;
      }

      const lastFour = cardDetails.cardNumber.replace(/\D/g, '').slice(-4);
      // TODO: Conectar con el Controlador/Backend → POST /api/payments
      const payment = await mockService.processPayment({
        method: 'tarjeta',
        amount: summary.totalFinal,
        reference: `Tarjeta **** ${lastFour}`,
      });

      if (!payment.approved) {
        setPaymentError(payment.message);
        setSubmitting(false);
        return;
      }
    } else if (form.paymentMethod === 'credito_institucional') {
      if (!form.purchaseOrder.trim()) {
        setPaymentError('Ingresa el número de orden de compra institucional.');
        setSubmitting(false);
        return;
      }

      // TODO: Conectar con el Controlador/Backend → POST /api/institutional-credit/validate
      const validation = await mockService.validateInstitutionalCredit({
        userId: user?.id ?? 0,
        amount: summary.totalFinal,
        purchaseOrder: form.purchaseOrder.trim(),
      });
      setCreditValidation(validation);

      if (!validation.approved) {
        setPaymentError(validation.message);
        setSubmitting(false);
        return;
      }
    } else {
      // TODO: Conectar con el Controlador/Backend → POST /api/payments
      const payment = await mockService.processPayment({
        method: 'contra_entrega',
        amount: summary.totalFinal,
      });

      if (!payment.approved) {
        setPaymentError(payment.message);
        setSubmitting(false);
        return;
      }
    }

    // TODO: Conectar con el Controlador/Backend → POST /api/orders
    const createdOrder = await mockService.createOrder({
      items,
      userRole: role,
      userId: user?.id ?? 0,
      userName: form.fullName || user?.name || 'Cliente',
      customerType: isInstitutional ? 'institucional' : 'minorista',
      customerNit: form.nit,
      customerEmail: form.email,
      deliveryMethod: form.deliveryMethod,
      deliveryLabel: deliveryLabels[form.deliveryMethod] ?? form.deliveryMethod,
      deliveryAddress: form.address,
      paymentMethod: form.paymentMethod,
      paymentLabel: paymentLabels[form.paymentMethod],
      purchaseOrder: form.purchaseOrder.trim() || undefined,
      creditLineUsed:
        form.paymentMethod === 'credito_institucional' ? summary.totalFinal : undefined,
    });

    setOrder(createdOrder);
    clearCart();
    setSubmitting(false);
  };

  if (order) {
    return <ElectronicInvoice order={order} />;
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
                    placeholder={isInstitutional ? 'NIT institucional' : 'Opcional para minoristas'}
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
                      isInstitutional
                        ? 'Institucional · 8% de descuento adicional'
                        : 'Minorista · sin descuento adicional'
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
                <div className="sm:col-span-2">
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Método de pago
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentOptions.map((option) => {
                      const selected = form.paymentMethod === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`cursor-pointer rounded-xl border p-4 transition ${
                            selected
                              ? 'border-editorial-primary bg-editorial-beige/60 ring-1 ring-editorial-primary'
                              : 'border-gray-200 hover:border-editorial-secondary/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={option.value}
                            checked={selected}
                            onChange={() => updateField('paymentMethod', option.value)}
                            className="sr-only"
                          />
                          <p className="text-sm font-bold text-editorial-primary">
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {form.paymentMethod === 'tarjeta' && (
                  <div className="sm:col-span-2">
                    <CardPaymentGateway
                      details={cardDetails}
                      onChange={setCardDetails}
                      amount={summary?.totalFinal ?? 0}
                    />
                  </div>
                )}

                {form.paymentMethod === 'credito_institucional' && (
                  <div className="sm:col-span-2 rounded-xl border border-editorial-accent/40 bg-editorial-beige/40 p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                          Línea de crédito autorizada
                        </p>
                        <p className="text-2xl font-extrabold text-editorial-primary">
                          {formatQ(user?.creditLine ?? 0)}
                        </p>
                      </div>
                      <span className="self-start rounded-full border border-editorial-accent/50 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-editorial-primary">
                        {user?.validated ? 'Cuenta validada' : 'Cuenta pendiente de validación'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Orden de compra *
                        </label>
                        <input
                          type="text"
                          value={form.purchaseOrder}
                          onChange={(event) => updateField('purchaseOrder', event.target.value)}
                          placeholder="Ej. OC-UMES-2026-045"
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Monto a cargar
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={summary ? formatQ(summary.totalFinal) : 'Calculando...'}
                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleValidateCredit}
                      disabled={creditValidating || !summary}
                      className="w-full sm:w-auto bg-editorial-primary text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {creditValidating ? 'Validando línea...' : 'Validar línea de crédito'}
                    </button>

                    {creditValidation && (
                      <div
                        className={`rounded-lg border px-4 py-3 text-sm ${
                          creditValidation.approved
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        <p className="font-semibold">{creditValidation.message}</p>
                        <p className="text-xs mt-1">
                          Línea disponible después del cargo:{' '}
                          <span className="font-semibold">
                            {formatQ(creditValidation.availableLine)}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {form.paymentMethod === 'contra_entrega' && (
                  <div className="sm:col-span-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    El pago contra entrega se realiza en efectivo al momento de recibir el pedido.
                    Un asesor de LUMINA confirmará la disponibilidad y el horario de entrega.
                  </div>
                )}

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
              {paymentError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {paymentError}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || calculating || !summary}
                className="w-full bg-editorial-primary text-white font-bold px-5 py-3 rounded-lg shadow hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Procesando pago...' : 'Confirmar y pagar'}
              </button>
              <Link
                to="/cart"
                className="block text-center font-semibold px-5 py-2.5 rounded-lg border border-editorial-primary/30 text-editorial-primary hover:bg-editorial-beige transition"
              >
                Volver al carrito
              </Link>
              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                Al confirmar se generará el comprobante electrónico de la orden. La integración
                definitiva con la pasarela de pago y el controlador de órdenes queda pendiente.
              </p>
            </div>
          </div>
        </form>
      </main>

      <EditorialFooter />
    </div>
  );
}
