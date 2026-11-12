import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EditorialHeader } from '../components/EditorialHeader';
import { EditorialFooter } from '../components/EditorialFooter';
import { StatusBadge } from '../components/StatusBadge';
import { mockService } from '../services/mockService';
import type { Book } from '../services/mockService';
import { formatQ } from '../utils/format';
import { getCurrentUser } from '../utils/session';

type BookFormState = Omit<Book, 'id'>;

interface Notice {
  type: 'success' | 'error';
  message: string;
}

const createEmptyForm = (): BookFormState => ({
  title: '',
  author: '',
  isbn: '',
  price: 0,
  stock: 0,
  genre: 'Tecnología',
  format: 'tapa blanda',
  synopsis: '',
  coverImage:
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80',
  year: new Date().getFullYear(),
  edition: '1a edición',
  pages: 0,
  language: 'Español',
  publisher: 'LUMINA Editorial',
});

export default function AdminPanel() {
  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin';

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BookFormState>(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    // TODO: Conectar con el Controlador/Backend → GET /api/books
    const data = await mockService.getBooks();
    setBooks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return books;
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn.includes(query),
    );
  }, [books, search]);

  const stats = useMemo(() => {
    const totalTitles = books.length;
    const totalStock = books.reduce((total, book) => total + book.stock, 0);
    const inventoryValue = books.reduce((total, book) => total + book.price * book.stock, 0);
    const lowStock = books.filter((book) => book.stock <= 10).length;
    return { totalTitles, totalStock, inventoryValue, lowStock };
  }, [books]);

  const updateField = <K extends keyof BookFormState,>(
    field: K,
    value: BookFormState[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setModalOpen(true);
  };

  const openEditModal = (book: Book) => {
    const { id, ...rest } = book;
    setEditingId(id);
    setForm(rest);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!form.title.trim() || !form.author.trim() || !form.isbn.trim()) {
      setNotice({ type: 'error', message: 'Título, autor e ISBN son obligatorios.' });
      return;
    }
    if (form.price < 0 || form.stock < 0) {
      setNotice({ type: 'error', message: 'El precio y el stock no pueden ser negativos.' });
      return;
    }

    setSaving(true);

    // TODO: Conectar con el Controlador/Backend → POST /api/books | PUT /api/books/:id
    if (editingId !== null) {
      await mockService.updateBook(editingId, form);
    } else {
      await mockService.addBook(form);
    }

    await loadBooks();
    setSaving(false);
    setModalOpen(false);
    setNotice({
      type: 'success',
      message:
        editingId !== null
          ? 'Publicación actualizada correctamente.'
          : 'Publicación creada correctamente.',
    });
  };

  const handleDelete = async (book: Book) => {
    const confirmed = window.confirm(
      `¿Eliminar la publicación "${book.title}" del catálogo? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    // TODO: Conectar con el Controlador/Backend → DELETE /api/books/:id
    await mockService.deleteBook(book.id);
    await loadBooks();
    setNotice({ type: 'success', message: 'Publicación eliminada del catálogo.' });
  };

  const adjustStock = async (book: Book, delta: number) => {
    const nextStock = Math.max(0, book.stock + delta);
    // TODO: Conectar con el Controlador/Backend → PATCH /api/books/:id/stock
    const updated = await mockService.updateStock(book.id, nextStock);
    if (updated) {
      setBooks((previous) =>
        previous.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
      );
    }
  };

  return (
    <div className="min-h-screen bg-editorial-light text-editorial-dark flex flex-col">
      <EditorialHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-editorial-secondary font-bold">
              RF-05 · Administración
            </p>
            <h1 className="text-3xl font-extrabold text-editorial-primary">
              Control comercial del catálogo
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Crea, actualiza y elimina publicaciones, además de ajustar el stock disponible.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg shadow hover:bg-editorial-secondary transition"
          >
            + Nueva publicación
          </button>
        </div>

        {!isAdmin && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Estás viendo el panel en modo demostración. Inicia sesión como{' '}
            <span className="font-semibold">Admin General</span> para operar con el rol de
            administrador.
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
            { label: 'Títulos activos', value: stats.totalTitles.toString(), detail: 'en catálogo' },
            {
              label: 'Unidades en stock',
              value: stats.totalStock.toString(),
              detail: 'inventario total',
            },
            {
              label: 'Valor del inventario',
              value: formatQ(stats.inventoryValue),
              detail: 'precio base × stock',
            },
            {
              label: 'Alertas de stock',
              value: stats.lowStock.toString(),
              detail: 'títulos con 10 uds. o menos',
            },
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

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-bold text-editorial-primary">Catálogo administrable</h2>
            <div className="w-full sm:w-80">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título, autor o ISBN..."
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">
              Cargando catálogo administrable...
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No se encontraron publicaciones con ese criterio de búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-editorial-beige/60 text-editorial-primary">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">Publicación</th>
                    <th className="text-left font-semibold px-3 py-3">ISBN</th>
                    <th className="text-left font-semibold px-3 py-3">Género / Formato</th>
                    <th className="text-right font-semibold px-3 py-3">Precio</th>
                    <th className="text-center font-semibold px-3 py-3">Stock</th>
                    <th className="text-right font-semibold px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="align-middle hover:bg-gray-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-[240px]">
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="h-16 w-11 rounded object-cover border border-gray-200"
                          />
                          <div>
                            <Link
                              to={`/books/${book.id}`}
                              className="font-semibold text-editorial-primary hover:underline line-clamp-1"
                            >
                              {book.title}
                            </Link>
                            <p className="text-xs text-gray-500">{book.author}</p>
                            <p className="text-[10px] text-gray-400">{book.year} · {book.edition}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-gray-600 whitespace-nowrap">
                        {book.isbn}
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-xs font-semibold text-editorial-secondary">{book.genre}</p>
                        <p className="text-xs text-gray-500 capitalize">{book.format}</p>
                      </td>
                      <td className="px-3 py-4 text-right font-semibold text-editorial-secondary whitespace-nowrap">
                        {formatQ(book.price)}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => adjustStock(book, -1)}
                              disabled={book.stock === 0}
                              className="px-2 py-1 text-editorial-primary hover:bg-editorial-beige disabled:opacity-40"
                              aria-label={`Reducir stock de ${book.title}`}
                            >
                              -
                            </button>
                            <span className="w-12 text-center py-1 border-x border-gray-200 font-semibold">
                              {book.stock}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustStock(book, 1)}
                              className="px-2 py-1 text-editorial-primary hover:bg-editorial-beige"
                              aria-label={`Aumentar stock de ${book.title}`}
                            >
                              +
                            </button>
                          </div>
                          {book.stock === 0 ? (
                            <StatusBadge tone="red">Agotado</StatusBadge>
                          ) : book.stock <= 10 ? (
                            <StatusBadge tone="amber">Stock bajo</StatusBadge>
                          ) : (
                            <StatusBadge tone="green">Disponible</StatusBadge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(book)}
                            className="text-xs font-semibold text-editorial-primary border border-editorial-primary/30 px-3 py-1.5 rounded-lg hover:bg-editorial-beige transition"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(book)}
                            className="text-xs font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                          >
                            Eliminar
                          </button>
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-editorial-primary">
                  {editingId !== null ? 'Editar publicación' : 'Nueva publicación'}
                </h2>
                <p className="text-xs text-gray-500">
                  {editingId !== null
                    ? 'Actualiza los datos bibliográficos y comerciales.'
                    : 'Registra una nueva obra en el catálogo de LUMINA.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100 transition text-xl leading-none"
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(event) => updateField('title', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Autor *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.author}
                    onChange={(event) => updateField('author', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ISBN *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.isbn}
                    onChange={(event) => updateField('isbn', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Precio base (Q) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(event) => updateField('price', Number(event.target.value))}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Stock inicial *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.stock}
                    onChange={(event) => updateField('stock', Number(event.target.value))}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Género
                  </label>
                  <select
                    value={form.genre}
                    onChange={(event) => updateField('genre', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  >
                    {['Tecnología', 'Historia', 'Ciencia', 'Literatura', 'Negocios', 'Arte'].map(
                      (genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Formato
                  </label>
                  <select
                    value={form.format}
                    onChange={(event) =>
                      updateField('format', event.target.value as BookFormState['format'])
                    }
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  >
                    <option value="tapa blanda">Tapa blanda</option>
                    <option value="tapa dura">Tapa dura</option>
                    <option value="e-book">E-book</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Año de edición
                  </label>
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    value={form.year}
                    onChange={(event) => updateField('year', Number(event.target.value))}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Edición
                  </label>
                  <input
                    type="text"
                    value={form.edition}
                    onChange={(event) => updateField('edition', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Número de páginas
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.pages}
                    onChange={(event) => updateField('pages', Number(event.target.value))}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Idioma
                  </label>
                  <input
                    type="text"
                    value={form.language}
                    onChange={(event) => updateField('language', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Editorial
                  </label>
                  <input
                    type="text"
                    value={form.publisher}
                    onChange={(event) => updateField('publisher', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    URL de portada
                  </label>
                  <input
                    type="url"
                    value={form.coverImage}
                    onChange={(event) => updateField('coverImage', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sinopsis
                  </label>
                  <textarea
                    rows={3}
                    value={form.synopsis}
                    onChange={(event) => updateField('synopsis', event.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : editingId !== null ? 'Guardar cambios' : 'Crear publicación'}
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
