import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EditorialHeader } from '../components/EditorialHeader';
import { EditorialFooter } from '../components/EditorialFooter';
import { StatusBadge } from '../components/StatusBadge';
import { mockService, getVolumeDiscountRate } from '../services/mockService';
import type { Book, CustomOrderRequest } from '../services/mockService';
import { formatDate, todayInputValue } from '../utils/format';
import { getCurrentUser } from '../utils/session';

interface CustomOrderForm {
  bookId: string;
  customTitle: string;
  quantity: number;
  coverFinish: string;
  paperType: string;
  requiredDate: string;
  notes: string;
  contactName: string;
  institution: string;
  email: string;
  phone: string;
}

const coverFinishes = [
  'Tapa dura con foil dorado',
  'Tapa dura con estampado dorado',
  'Tapa dura con sobrecubierta',
  'Tapa blanda laminada mate',
  'Tapa blanda laminada brillante',
  'Encuadernación artesanal',
];

const paperTypes = [
  'Papel bond 80g',
  'Papel couché 150g',
  'Papel reciclado 90g',
  'Papel ahuesado 75g',
  'Papel opalina 200g',
];

export default function CustomOrder() {
  const user = getCurrentUser();
  const isInstitutional = user?.role === 'institutional_client';

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdRequest, setCreatedRequest] = useState<CustomOrderRequest | null>(null);

  const [form, setForm] = useState<CustomOrderForm>(() => ({
    bookId: 'custom',
    customTitle: '',
    quantity: 20,
    coverFinish: coverFinishes[0],
    paperType: paperTypes[0],
    requiredDate: '',
    notes: '',
    contactName: user?.name ?? '',
    institution: isInstitutional ? user?.name ?? '' : '',
    email: user?.email ?? '',
    phone: '',
  }));

  useEffect(() => {
    let isMounted = true;
    // TODO: Conectar con el Controlador/Backend → GET /api/books
    mockService.getBooks().then((data) => {
      if (!isMounted) return;
      setBooks(data);
      setLoadingBooks(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = <K extends keyof CustomOrderForm,>(
    field: K,
    value: CustomOrderForm[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const selectedBook = useMemo(
    () => books.find((book) => String(book.id) === form.bookId) ?? null,
    [books, form.bookId],
  );

  const volumeRate = getVolumeDiscountRate(form.quantity);
  const minDate = todayInputValue();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const bookTitle = form.bookId === 'custom' ? form.customTitle.trim() : selectedBook?.title ?? '';

    if (!bookTitle) {
      setError('Indica la obra o edición especial que deseas solicitar.');
      return;
    }
    if (!form.requiredDate) {
      setError('Selecciona la fecha requerida de entrega.');
      return;
    }
    if (form.quantity < 1) {
      setError('La cantidad estimada debe ser mayor a cero.');
      return;
    }

    setSubmitting(true);

    // TODO: Conectar con el Controlador/Backend → POST /api/custom-orders
    const request = await mockService.createCustomOrder({
      userId: user?.id ?? 0,
      clientName: form.contactName || form.institution || 'Cliente institucional',
      clientEmail: form.email || user?.email || 'sin-correo@lumina.com',
      bookId: selectedBook?.id ?? null,
      bookTitle,
      quantity: Math.floor(form.quantity),
      coverFinish: form.coverFinish,
      paperType: form.paperType,
      requiredDate: form.requiredDate,
      notes: form.notes,
    });

    setCreatedRequest(request);
    setSubmitting(false);
  };

  const resetForm = () => {
    setCreatedRequest(null);
    setError('');
    setForm((previous) => ({
      ...previous,
      bookId: 'custom',
      customTitle: '',
      quantity: 20,
      requiredDate: '',
      notes: '',
    }));
  };

  return (
    <div className="min-h-screen bg-editorial-light text-editorial-dark flex flex-col">
      <EditorialHeader />

      <main className="flex-1">
        <section className="bg-gradient-to-r from-editorial-primary to-editorial-secondary text-white py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <p className="text-xs uppercase tracking-widest font-bold text-editorial-accent">
              RF-04 · Pedidos personalizados
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2">
              Solicitud de ediciones especiales
            </h1>
            <p className="text-gray-200 mt-2 max-w-3xl">
              Espacio para clientes institucionales que requieren volúmenes masivos, acabados
              personalizados o reimpresiones especiales. Un asesor comercial evaluará la solicitud y
              emitirá una cotización formal.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-10">
          {!isInstitutional && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Este formulario está orientado a clientes institucionales. Puedes enviar la solicitud
              en modo demostración; inicia sesión con la cuenta institucional para aplicar el 8% de
              descuento acumulativo en la cotización.
            </div>
          )}

          {createdRequest ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <StatusBadge tone="green">Solicitud registrada</StatusBadge>
                  <h2 className="text-2xl font-extrabold text-editorial-primary mt-3">
                    Solicitud #{createdRequest.id.toString().padStart(5, '0')}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Tu pedido personalizado fue recibido y está pendiente de evaluación por el
                    asesor de ventas.
                  </p>
                </div>
                <div className="rounded-lg bg-editorial-beige/60 px-4 py-3 text-sm">
                  <p className="text-xs text-gray-500">Estado actual</p>
                  <p className="font-bold text-editorial-primary capitalize">
                    {createdRequest.status.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Obra solicitada</p>
                  <p className="font-semibold text-editorial-primary">{createdRequest.bookTitle}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Cantidad estimada</p>
                  <p className="font-semibold text-editorial-primary">
                    {createdRequest.quantity} unidades
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Acabado de portada</p>
                  <p className="font-semibold text-editorial-primary">{createdRequest.coverFinish}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500">Fecha requerida</p>
                  <p className="font-semibold text-editorial-primary">
                    {formatDate(createdRequest.requiredDate)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-semibold text-editorial-primary mb-1">Siguiente paso</p>
                <p>
                  El asesor revisará la disponibilidad, el acabado y el tipo de papel para emitir
                  una cotización formal con descuentos por volumen e IVA. Recibirás la propuesta en{' '}
                  <span className="font-semibold">{createdRequest.clientEmail}</span>.
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition"
                >
                  Registrar otra solicitud
                </button>
                <Link
                  to="/catalog"
                  className="border border-editorial-primary/30 text-editorial-primary font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-beige transition text-center"
                >
                  Volver al catálogo
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <form
                onSubmit={handleSubmit}
                className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8"
              >
                <h2 className="text-lg font-bold text-editorial-primary mb-1">
                  Datos de la solicitud
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Los campos marcados con * son obligatorios.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Obra / título de interés *
                    </label>
                    <select
                      value={form.bookId}
                      onChange={(event) => updateField('bookId', event.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                    >
                      <option value="custom">Otra obra / edición especial</option>
                      {!loadingBooks &&
                        books.map((book) => (
                          <option key={book.id} value={String(book.id)}>
                            {book.title} — {book.author}
                          </option>
                        ))}
                    </select>
                  </div>

                  {form.bookId === 'custom' && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Título o descripción de la obra *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.customTitle}
                        onChange={(event) => updateField('customTitle', event.target.value)}
                        placeholder="Ej. Edición conmemorativa de la facultad de ingeniería"
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Cantidad estimada *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={form.quantity}
                      onChange={(event) =>
                        updateField('quantity', Math.max(1, Number(event.target.value) || 1))
                      }
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Fecha requerida de entrega *
                    </label>
                    <input
                      type="date"
                      required
                      min={minDate}
                      value={form.requiredDate}
                      onChange={(event) => updateField('requiredDate', event.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Acabado de portada *
                    </label>
                    <select
                      value={form.coverFinish}
                      onChange={(event) => updateField('coverFinish', event.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                    >
                      {coverFinishes.map((finish) => (
                        <option key={finish} value={finish}>
                          {finish}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tipo de papel *
                    </label>
                    <select
                      value={form.paperType}
                      onChange={(event) => updateField('paperType', event.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                    >
                      {paperTypes.map((paper) => (
                        <option key={paper} value={paper}>
                          {paper}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Detalles adicionales / especificaciones
                    </label>
                    <textarea
                      rows={4}
                      value={form.notes}
                      onChange={(event) => updateField('notes', event.target.value)}
                      placeholder="Incluye dedicatorias, logos institucionales, medidas especiales, empaque..."
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-editorial-primary mb-4">
                    Datos de contacto institucional
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nombre del contacto *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.contactName}
                        onChange={(event) => updateField('contactName', event.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Institución / empresa
                      </label>
                      <input
                        type="text"
                        value={form.institution}
                        onChange={(event) => updateField('institution', event.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Correo electrónico *
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
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(event) => updateField('phone', event.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 w-full bg-editorial-primary text-white font-bold px-5 py-3 rounded-lg shadow hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Enviando solicitud...' : 'Enviar solicitud de cotización'}
                </button>
              </form>

              <aside className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-editorial-primary mb-4">
                    Flujo de la solicitud
                  </h2>
                  <ol className="space-y-4 text-sm">
                    {[
                      ['1', 'Solicitud', 'Registras la obra, cantidad y especificaciones.'],
                      ['2', 'Revisión', 'El asesor valida disponibilidad y viabilidad.'],
                      ['3', 'Cotización', 'Recibes una propuesta formal con IVA y descuentos.'],
                      ['4', 'Aprobación', 'Confirmas la cotización y se programa la producción.'],
                    ].map(([step, title, description]) => (
                      <li key={step} className="flex gap-3">
                        <span className="h-7 w-7 shrink-0 rounded-full bg-editorial-primary text-white text-xs font-bold flex items-center justify-center">
                          {step}
                        </span>
                        <div>
                          <p className="font-semibold text-editorial-primary">{title}</p>
                          <p className="text-xs text-gray-500">{description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-editorial-primary text-white rounded-xl shadow-sm p-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-editorial-accent mb-3">
                    Descuento por volumen
                  </h2>
                  <p className="text-sm text-gray-200">
                    Tu cantidad estimada actual es de{' '}
                    <span className="font-bold text-white">{form.quantity} unidades</span>.
                  </p>
                  <p className="text-3xl font-extrabold text-editorial-accent mt-2">
                    {Math.round(volumeRate * 100)}%
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    {volumeRate > 0
                      ? 'Este porcentaje se aplicará en la cotización formal.'
                      : 'A partir de 6 unidades comienza a aplicar el descuento por volumen.'}
                  </p>
                  <div className="mt-4 space-y-1 text-[11px] text-gray-300">
                    <p>1-5 unidades: 0%</p>
                    <p>6-20 unidades: 5%</p>
                    <p>21-50 unidades: 10%</p>
                    <p>Más de 50 unidades: 15%</p>
                  </div>
                </div>

                <div className="bg-editorial-beige/70 rounded-xl p-5 text-xs text-editorial-primary">
                  <p className="font-bold mb-1">Nota comercial</p>
                  <p>
                    Los clientes institucionales acumulan 8% adicional sobre el subtotal con
                    descuento por volumen. El IVA del 12% se calcula al final.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
}
