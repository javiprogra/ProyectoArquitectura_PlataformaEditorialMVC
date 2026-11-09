import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EditorialHeader } from '../components/EditorialHeader';
import { EditorialFooter } from '../components/EditorialFooter';
import { StatusBadge } from '../components/StatusBadge';
import { useCart } from '../context/CartContext';
import { mockService } from '../services/mockService';
import type { Book } from '../services/mockService';
import { formatQ } from '../utils/format';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const bookId = Number(id);
  const { addItem } = useCart();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setQuantity(1);
    setFeedback('');

    // TODO: Conectar con el Controlador/Backend → GET /api/books/:id
    mockService.getBookById(bookId).then((data) => {
      if (!isMounted) return;
      setBook(data);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [bookId]);

  const stockInfo = useMemo(() => {
    if (!book) return null;
    if (book.stock === 0) {
      return {
        label: 'Agotado',
        detail: 'Sin unidades disponibles por el momento',
        badgeTone: 'red' as const,
        barClassName: 'bg-red-500',
      };
    }
    if (book.stock <= 10) {
      return {
        label: 'Stock bajo',
        detail: `Últimas ${book.stock} unidades disponibles`,
        badgeTone: 'amber' as const,
        barClassName: 'bg-amber-500',
      };
    }
    return {
      label: 'Disponible',
      detail: `${book.stock} unidades en inventario`,
      badgeTone: 'green' as const,
      barClassName: 'bg-emerald-500',
    };
  }, [book]);

  const maxQuantity = book ? Math.max(book.stock, 1) : 1;

  const handleAddToCart = () => {
    if (!book || book.stock === 0) return;
    const safeQuantity = Math.min(quantity, book.stock);
    addItem(book.id, safeQuantity);
    setFeedback(`Se agregaron ${safeQuantity} unidad(es) de "${book.title}" al carrito.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-editorial-light flex flex-col">
        <EditorialHeader />
        <main className="flex-1 flex items-center justify-center py-24 text-gray-500">
          Cargando ficha técnica de la obra...
        </main>
        <EditorialFooter />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-editorial-light flex flex-col">
        <EditorialHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center max-w-lg">
            <h1 className="text-2xl font-bold text-editorial-primary mb-3">Obra no encontrada</h1>
            <p className="text-gray-600 mb-6">
              La publicación solicitada no existe o fue retirada del catálogo.
            </p>
            <Link
              to="/catalog"
              className="inline-flex bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition"
            >
              Volver al catálogo
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

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <nav className="text-xs text-gray-500 flex items-center gap-2">
            <Link to="/" className="hover:text-editorial-primary transition">
              Inicio
            </Link>
            <span>/</span>
            <Link to="/catalog" className="hover:text-editorial-primary transition">
              Catálogo
            </Link>
            <span>/</span>
            <span className="text-editorial-primary font-semibold line-clamp-1">{book.title}</span>
          </nav>
        </div>

        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-6">
                <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-white">
                  <img
                    src={book.coverImage}
                    alt={`Portada de ${book.title}`}
                    className="w-full h-[430px] object-cover"
                  />
                  <span className="absolute top-3 left-3 bg-editorial-primary text-white text-xs px-2.5 py-1 rounded-full uppercase font-medium">
                    {book.format}
                  </span>
                </div>
                <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Código ISBN
                  </p>
                  <p className="font-mono text-sm text-editorial-primary">{book.isbn}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-editorial-secondary uppercase tracking-wide bg-editorial-accent/20 px-2.5 py-1 rounded">
                    {book.genre}
                  </span>
                  {stockInfo && (
                    <StatusBadge tone={stockInfo.badgeTone}>{stockInfo.label}</StatusBadge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-editorial-primary leading-tight">
                  {book.title}
                </h1>
                <p className="text-lg text-gray-600 mt-2">
                  por <span className="font-semibold text-editorial-secondary">{book.author}</span>
                </p>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-gray-100 py-5">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500">Precio base</p>
                    <p className="text-3xl font-extrabold text-editorial-secondary">
                      {formatQ(book.price)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">IVA calculado en el carrito</p>
                  </div>

                  <div className="min-w-[190px]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-editorial-primary">
                        {stockInfo?.detail}
                      </span>
                      <span className="text-gray-500">{book.stock} uds.</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${stockInfo?.barClassName ?? 'bg-gray-400'}`}
                        style={{ width: `${Math.min((book.stock / 50) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-editorial-primary mb-2">
                    Sinopsis
                  </h2>
                  <p className="text-gray-700 leading-relaxed">{book.synopsis}</p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden w-fit">
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      disabled={quantity <= 1 || book.stock === 0}
                      className="px-4 py-2.5 text-lg font-bold text-editorial-primary hover:bg-editorial-beige disabled:opacity-40 transition"
                      aria-label="Disminuir cantidad"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxQuantity}
                      value={quantity}
                      disabled={book.stock === 0}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        if (Number.isNaN(nextValue)) return;
                        setQuantity(Math.max(1, Math.min(nextValue, maxQuantity)));
                      }}
                      className="w-16 text-center py-2.5 border-x border-gray-200 focus:outline-none disabled:bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                      disabled={quantity >= maxQuantity || book.stock === 0}
                      className="px-4 py-2.5 text-lg font-bold text-editorial-primary hover:bg-editorial-beige disabled:opacity-40 transition"
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={book.stock === 0}
                    className="bg-editorial-primary text-white font-bold px-6 py-3 rounded-lg shadow hover:bg-editorial-secondary transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {book.stock === 0 ? 'Sin stock disponible' : 'Agregar al carrito'}
                  </button>

                  <Link
                    to="/cart"
                    className="text-editorial-secondary font-semibold px-4 py-3 rounded-lg border border-editorial-secondary/30 hover:bg-editorial-secondary hover:text-white transition text-center"
                  >
                    Ir al carrito
                  </Link>
                </div>

                {feedback && (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {feedback}
                  </div>
                )}

                <div className="mt-5 rounded-lg bg-editorial-beige/60 px-4 py-3 text-xs text-editorial-primary">
                  Compra por volumen: 6 a 20 unidades obtienen 5% de descuento; 21 a 50 unidades,
                  10%; más de 50 unidades, 15%. Los clientes institucionales suman 8% adicional.
                </div>
              </div>

              <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
                <h2 className="text-lg font-bold text-editorial-primary mb-4">
                  Ficha bibliográfica completa
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Título</dt>
                    <dd className="font-semibold text-editorial-dark">{book.title}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Autor</dt>
                    <dd className="font-semibold text-editorial-dark">{book.author}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Editorial</dt>
                    <dd className="font-semibold text-editorial-dark">{book.publisher}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Año de edición</dt>
                    <dd className="font-semibold text-editorial-dark">{book.year}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Edición</dt>
                    <dd className="font-semibold text-editorial-dark">{book.edition}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Formato</dt>
                    <dd className="font-semibold text-editorial-dark capitalize">{book.format}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Número de páginas</dt>
                    <dd className="font-semibold text-editorial-dark">{book.pages}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Idioma</dt>
                    <dd className="font-semibold text-editorial-dark">{book.language}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Género</dt>
                    <dd className="font-semibold text-editorial-dark">{book.genre}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">ISBN</dt>
                    <dd className="font-mono font-semibold text-editorial-dark">{book.isbn}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
}
