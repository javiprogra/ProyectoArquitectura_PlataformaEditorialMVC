import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EditorialHeader } from '../components/EditorialHeader';
import { EditorialFooter } from '../components/EditorialFooter';
import { StatusBadge } from '../components/StatusBadge';
import type { BadgeTone } from '../components/StatusBadge';
import { mockService, getVolumeDiscountRate, IVA_RATE } from '../services/mockService';
import type {
  CustomOrderRequest,
  CustomOrderStatus,
  Quote,
  QuoteStatus,
} from '../services/mockService';
import { addDaysInputValue, formatDate, formatQ, todayInputValue } from '../utils/format';
import { getCurrentUser } from '../utils/session';

interface QuoteForm {
  unitPrice: string;
  validUntil: string;
  notes: string;
}

interface Notice {
  type: 'success' | 'error';
  message: string;
}

const requestStatusLabels: Record<CustomOrderStatus, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  cotizada: 'Cotizada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const requestStatusTones: Record<CustomOrderStatus, BadgeTone> = {
  pendiente: 'amber',
  en_revision: 'blue',
  cotizada: 'gold',
  aprobada: 'green',
  rechazada: 'red',
};

const quoteStatusLabels: Record<QuoteStatus, string> = {
  emitida: 'Emitida',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

const quoteStatusTones: Record<QuoteStatus, BadgeTone> = {
  emitida: 'gold',
  aprobada: 'green',
  rechazada: 'red',
};

const filterOptions: Array<{ value: CustomOrderStatus | 'todas'; label: string }> = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'cotizada', label: 'Cotizadas' },
  { value: 'aprobada', label: 'Aprobadas' },
  { value: 'rechazada', label: 'Rechazadas' },
];

export default function AdvisorDashboard() {
  const user = getCurrentUser();
  const isAdvisor = user?.role === 'sales_advisor';

  const [requests, setRequests] = useState<CustomOrderRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CustomOrderStatus | 'todas'>('todas');
  const [selectedRequest, setSelectedRequest] = useState<CustomOrderRequest | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<CustomOrderRequest | null>(null);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>({
    unitPrice: '',
    validUntil: addDaysInputValue(30),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [requestsData, quotesData] = await Promise.all([
        mockService.getCustomOrders(),
        mockService.getQuotes(),
      ]);
      setRequests(requestsData);
      setQuotes(quotesData);
    } catch {
      setRequests([]);
      setQuotes([]);
      setNotice({
        type: 'error',
        message: 'No fue posible cargar la bandeja comercial. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRequests = useMemo(
    () => (filter === 'todas' ? requests : requests.filter((request) => request.status === filter)),
    [requests, filter],
  );

  const stats = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === 'pendiente').length,
      inReview: requests.filter((request) => request.status === 'en_revision').length,
      quoted: requests.filter((request) => request.status === 'cotizada').length,
      approved: requests.filter((request) => request.status === 'aprobada').length,
    }),
    [requests],
  );

  const updateQuoteField = (field: keyof QuoteForm, value: string) => {
    setQuoteForm((previous) => ({ ...previous, [field]: value }));
  };

  const openQuoteModal = (request: CustomOrderRequest) => {
    setSelectedRequest(null);
    setQuoteTarget(request);
    setQuoteForm({ unitPrice: '', validUntil: addDaysInputValue(30), notes: '' });
  };

  const handleRequestStatus = async (request: CustomOrderRequest, status: CustomOrderStatus) => {
    if (
      status === 'rechazada' &&
      !window.confirm(`¿Rechazar la solicitud #${request.id} de ${request.clientName}?`)
    ) {
      return;
    }

    // TODO: Conectar con el Controlador/Backend → PATCH /api/custom-orders/:id/status
    await mockService.updateCustomOrderStatus(request.id, status);
    await loadData();
    setSelectedRequest(null);
    setNotice({
      type: 'success',
      message: `Solicitud #${request.id} actualizada a "${requestStatusLabels[status]}".`,
    });
  };

  const handleQuoteStatus = async (quote: Quote, status: QuoteStatus) => {
    if (
      status === 'rechazada' &&
      !window.confirm(`¿Rechazar la cotización #${quote.id} de ${quote.clientName}?`)
    ) {
      return;
    }

    // TODO: Conectar con el Controlador/Backend → PATCH /api/quotes/:id/status
    await mockService.updateQuoteStatus(quote.id, status);
    await loadData();
    setNotice({
      type: 'success',
      message: `Cotización #${quote.id} marcada como "${quoteStatusLabels[status]}".`,
    });
  };

  const quantity = quoteTarget?.quantity ?? 0;
  const unitPrice = Number(quoteForm.unitPrice) || 0;
  const subtotalBase = unitPrice * quantity;
  const volumeRate = getVolumeDiscountRate(quantity);
  const volumeDiscountAmount = subtotalBase * volumeRate;
  const subtotal = subtotalBase - volumeDiscountAmount;
  const tax = subtotal * IVA_RATE;
  const total = subtotal + tax;

  const handleCreateQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quoteTarget) return;
    if (unitPrice <= 0) {
      setNotice({ type: 'error', message: 'Ingresa un precio unitario mayor a cero.' });
      return;
    }

    setSaving(true);
    const advisor = getCurrentUser();

    // TODO: Conectar con el Controlador/Backend → POST /api/quotes
    const quote = await mockService.createQuote({
      requestId: quoteTarget.id,
      advisorId: advisor?.id ?? 4,
      advisorName: advisor?.name ?? 'Lic. Sofía Asesor',
      clientName: quoteTarget.clientName,
      bookTitle: quoteTarget.bookTitle,
      quantity,
      unitPrice,
      subtotal,
      volumeDiscountPercentage: volumeRate * 100,
      volumeDiscountAmount,
      tax,
      total,
      validUntil: quoteForm.validUntil || addDaysInputValue(30),
      notes: quoteForm.notes,
    });

    setSaving(false);
    setQuoteTarget(null);
    await loadData();
    setNotice({
      type: 'success',
      message: `Cotización #${quote.id.toString().padStart(4, '0')} emitida por ${formatQ(
        quote.total,
      )}.`,
    });
  };

  return (
    <div className="min-h-screen bg-editorial-light text-editorial-dark flex flex-col">
      <EditorialHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-editorial-secondary font-bold">
              RF-05 · Asesor de ventas
            </p>
            <h1 className="text-3xl font-extrabold text-editorial-primary">
              Bandeja de evaluación comercial
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Revisa solicitudes institucionales, aprueba o rechaza pedidos y emite cotizaciones
              formales con el motor de descuentos.
            </p>
          </div>
          <div className="rounded-lg bg-white border border-gray-200 px-4 py-3 text-sm shadow-sm">
            <p className="text-xs text-gray-500">Asesor en sesión</p>
            <p className="font-semibold text-editorial-primary">
              {user?.name ?? 'Lic. Sofía Asesor'}
            </p>
          </div>
        </div>

        {!isAdvisor && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Estás viendo la bandeja en modo demostración. Inicia sesión como{' '}
            <span className="font-semibold">Lic. Sofía Asesor</span> para operar con el rol de
            asesor de ventas.
          </div>
        )}

        {notice && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pendientes', value: stats.pending, detail: 'por evaluar' },
            { label: 'En revisión', value: stats.inReview, detail: 'en análisis técnico' },
            { label: 'Cotizadas', value: stats.quoted, detail: 'con propuesta emitida' },
            { label: 'Aprobadas', value: stats.approved, detail: 'listas para producción' },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
            >
              <p className="text-xs uppercase tracking-wider text-gray-500">{card.label}</p>
              <p className="text-2xl font-extrabold text-editorial-primary mt-2">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-editorial-primary">
              Solicitudes de pedidos personalizados
            </h2>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    filter === option.value
                      ? 'bg-editorial-primary text-white border-editorial-primary'
                      : 'bg-white text-editorial-primary border-gray-200 hover:bg-editorial-beige'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-sm text-gray-500">
              Cargando bandeja comercial...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-sm text-gray-500">
              No hay solicitudes con el estado seleccionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRequests.map((request) => (
                <article
                  key={request.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">
                        Solicitud #{request.id.toString().padStart(4, '0')} ·{' '}
                        {formatDate(request.createdAt)}
                      </p>
                      <h3 className="font-bold text-editorial-primary mt-1">
                        {request.bookTitle}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {request.clientName} · {request.clientEmail}
                      </p>
                    </div>
                    <StatusBadge tone={requestStatusTones[request.status]}>
                      {requestStatusLabels[request.status]}
                    </StatusBadge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-gray-50 p-2.5">
                      <p className="text-gray-500">Cantidad</p>
                      <p className="font-semibold text-editorial-primary">{request.quantity} uds.</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2.5">
                      <p className="text-gray-500">Entrega requerida</p>
                      <p className="font-semibold text-editorial-primary">
                        {formatDate(request.requiredDate)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2.5">
                      <p className="text-gray-500">Tipo de papel</p>
                      <p className="font-semibold text-editorial-primary">{request.paperType}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2.5 col-span-2 sm:col-span-3">
                      <p className="text-gray-500">Acabado de portada</p>
                      <p className="font-semibold text-editorial-primary">{request.coverFinish}</p>
                    </div>
                  </div>

                  {request.notes && (
                    <p className="mt-3 text-xs text-gray-600 line-clamp-2">{request.notes}</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(request)}
                      className="text-xs font-semibold text-editorial-primary border border-editorial-primary/30 px-3 py-1.5 rounded-lg hover:bg-editorial-beige transition"
                    >
                      Ver detalle
                    </button>
                    <button
                      type="button"
                      onClick={() => openQuoteModal(request)}
                      disabled={request.status === 'rechazada'}
                      className="text-xs font-semibold text-white bg-editorial-primary px-3 py-1.5 rounded-lg hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Emitir cotización
                    </button>
                    {request.status !== 'aprobada' && (
                      <button
                        type="button"
                        onClick={() => handleRequestStatus(request, 'aprobada')}
                        className="text-xs font-semibold text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition"
                      >
                        Aprobar
                      </button>
                    )}
                    {request.status !== 'rechazada' && (
                      <button
                        type="button"
                        onClick={() => handleRequestStatus(request, 'rechazada')}
                        className="text-xs font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                      >
                        Rechazar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-editorial-primary">Cotizaciones formales emitidas</h2>
            <p className="text-xs text-gray-500 mt-1">
              Propuestas generadas desde las solicitudes institucionales.
            </p>
          </div>

          {quotes.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Aún no se han emitido cotizaciones.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-editorial-beige/60 text-editorial-primary">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">Cotización</th>
                    <th className="text-left font-semibold px-3 py-3">Cliente / Obra</th>
                    <th className="text-center font-semibold px-3 py-3">Cantidad</th>
                    <th className="text-right font-semibold px-3 py-3">Subtotal</th>
                    <th className="text-right font-semibold px-3 py-3">Total</th>
                    <th className="text-center font-semibold px-3 py-3">Estado</th>
                    <th className="text-right font-semibold px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="align-middle hover:bg-gray-50/70">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="font-mono font-semibold text-editorial-primary">
                          #{quote.id.toString().padStart(4, '0')}
                        </p>
                        <p className="text-[10px] text-gray-500">{formatDate(quote.createdAt)}</p>
                        <p className="text-[10px] text-gray-400">
                          Vence: {formatDate(quote.validUntil)}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-semibold text-editorial-primary">{quote.clientName}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{quote.bookTitle}</p>
                        <p className="text-[10px] text-gray-400">{quote.advisorName}</p>
                      </td>
                      <td className="px-3 py-4 text-center">{quote.quantity}</td>
                      <td className="px-3 py-4 text-right whitespace-nowrap">
                        <p className="font-semibold">{formatQ(quote.subtotal)}</p>
                        <p className="text-[10px] text-emerald-700">
                          -{quote.volumeDiscountPercentage}% volumen
                        </p>
                      </td>
                      <td className="px-3 py-4 text-right font-bold text-editorial-secondary whitespace-nowrap">
                        {formatQ(quote.total)}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <StatusBadge tone={quoteStatusTones[quote.status]}>
                          {quoteStatusLabels[quote.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {quote.status === 'emitida' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuoteStatus(quote, 'aprobada')}
                                className="text-xs font-semibold text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition"
                              >
                                Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuoteStatus(quote, 'rechazada')}
                                className="text-xs font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          {quote.status !== 'emitida' && (
                            <span className="text-[10px] text-gray-400">Sin acciones</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-editorial-primary">
                  Detalle de la solicitud #{selectedRequest.id.toString().padStart(4, '0')}
                </h2>
                <p className="text-xs text-gray-500">
                  Registrada el {formatDate(selectedRequest.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100 transition text-xl leading-none"
                aria-label="Cerrar detalle"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="font-semibold text-editorial-primary">
                    {selectedRequest.clientName}
                  </p>
                  <p className="text-xs text-gray-500">{selectedRequest.clientEmail}</p>
                </div>
                <StatusBadge tone={requestStatusTones[selectedRequest.status]}>
                  {requestStatusLabels[selectedRequest.status]}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Obra solicitada</p>
                  <p className="font-semibold text-editorial-primary">
                    {selectedRequest.bookTitle}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Cantidad estimada</p>
                  <p className="font-semibold text-editorial-primary">
                    {selectedRequest.quantity} unidades
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Acabado de portada</p>
                  <p className="font-semibold text-editorial-primary">
                    {selectedRequest.coverFinish}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">Tipo de papel</p>
                  <p className="font-semibold text-editorial-primary">
                    {selectedRequest.paperType}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 sm:col-span-2">
                  <p className="text-xs text-gray-500">Fecha requerida de entrega</p>
                  <p className="font-semibold text-editorial-primary">
                    {formatDate(selectedRequest.requiredDate)}
                  </p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    Especificaciones adicionales
                  </p>
                  {selectedRequest.notes}
                </div>
              )}

              {quotes.some((quote) => quote.requestId === selectedRequest.id) && (
                <div className="rounded-lg border border-editorial-accent/40 bg-editorial-beige/50 p-4">
                  <p className="text-xs font-semibold text-editorial-primary mb-2">
                    Cotizaciones vinculadas
                  </p>
                  <ul className="space-y-2 text-sm">
                    {quotes
                      .filter((quote) => quote.requestId === selectedRequest.id)
                      .map((quote) => (
                        <li key={quote.id} className="flex items-center justify-between gap-3">
                          <span>
                            #{quote.id.toString().padStart(4, '0')} · {formatQ(quote.total)}
                          </span>
                          <StatusBadge tone={quoteStatusTones[quote.status]}>
                            {quoteStatusLabels[quote.status]}
                          </StatusBadge>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => openQuoteModal(selectedRequest)}
                disabled={selectedRequest.status === 'rechazada'}
                className="text-sm font-semibold text-white bg-editorial-primary px-4 py-2 rounded-lg hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Emitir cotización
              </button>
              {selectedRequest.status !== 'aprobada' && (
                <button
                  type="button"
                  onClick={() => handleRequestStatus(selectedRequest, 'aprobada')}
                  className="text-sm font-semibold text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-50 transition"
                >
                  Aprobar solicitud
                </button>
              )}
              {selectedRequest.status !== 'rechazada' && (
                <button
                  type="button"
                  onClick={() => handleRequestStatus(selectedRequest, 'rechazada')}
                  className="text-sm font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition"
                >
                  Rechazar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {quoteTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-editorial-primary">
                  Emitir cotización formal
                </h2>
                <p className="text-xs text-gray-500">
                  Solicitud #{quoteTarget.id.toString().padStart(4, '0')} · {quoteTarget.clientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteTarget(null)}
                className="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100 transition text-xl leading-none"
                aria-label="Cerrar cotización"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-6 space-y-5">
              <div className="rounded-lg bg-editorial-beige/60 p-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Obra</p>
                    <p className="font-semibold text-editorial-primary">{quoteTarget.bookTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cantidad</p>
                    <p className="font-semibold text-editorial-primary">
                      {quoteTarget.quantity} unidades
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Descuento por volumen</p>
                    <p className="font-semibold text-editorial-primary">
                      {Math.round(volumeRate * 100)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Precio unitario propuesto (Q) *
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    required
                    value={quoteForm.unitPrice}
                    onChange={(event) => updateQuoteField('unitPrice', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Vigencia de la cotización *
                  </label>
                  <input
                    type="date"
                    required
                    min={todayInputValue()}
                    value={quoteForm.validUntil}
                    onChange={(event) => updateQuoteField('validUntil', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Notas comerciales
                  </label>
                  <textarea
                    rows={3}
                    value={quoteForm.notes}
                    onChange={(event) => updateQuoteField('notes', event.target.value)}
                    placeholder="Condiciones de producción, tiempos de entrega, empaque..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal base</span>
                  <span className="font-semibold">{formatQ(subtotalBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Descuento por volumen ({Math.round(volumeRate * 100)}%)
                  </span>
                  <span className="font-semibold text-emerald-700">
                    - {formatQ(volumeDiscountAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal con descuento</span>
                  <span className="font-semibold">{formatQ(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA (12%)</span>
                  <span className="font-semibold">{formatQ(tax)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
                  <span className="font-bold text-editorial-primary">Total cotizado</span>
                  <span className="font-extrabold text-editorial-secondary">{formatQ(total)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuoteTarget(null)}
                  className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Emitiendo...' : 'Emitir cotización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <EditorialFooter />
    </div>
  );
}
