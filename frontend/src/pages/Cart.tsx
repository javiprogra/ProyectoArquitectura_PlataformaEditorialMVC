import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EditorialHeader } from '../components/EditorialHeader';
import { EditorialFooter } from '../components/EditorialFooter';
import { OrderSummary } from '../components/OrderSummary';
import { useCart } from '../context/CartContext';
import { mockService } from '../services/mockService';
import type { Book, OrderCalculation } from '../services/mockService';
import { formatQ } from '../utils/format';
import { getCurrentRole, getCurrentUser } from '../utils/session';

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const role = getCurrentRole();
  const user = getCurrentUser();

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [summary, setSummary] = useState<OrderCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

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

  const handleQuantityChange = (bookId: number, value: number, max: number) => {
    if (Number.isNaN(value)) return;
    updateQuantity(bookId, Math.max(1, Math.min(Math.floor(value), Math.max(max, 1))));
  };

  const emptyCart = items.length === 0;

  return (
    <div className="min-h-screen bg-editorial-light text-editorial-dark flex flex-col">
      <EditorialHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-editorial-secondary font-bold">
              RF-03 · Cierre de orden
            </p>
            <h1 className="text-3xl font-extrabold text-editorial-primary">Carrito de compras</h1>
            <p className="text-sm text-gray-600 mt-1">
              Revisa tus obras, ajusta cantidades y visualiza el desglose comercial.
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-editorial-secondary font-semibold text-sm hover:underline"
          >
            &larr; Seguir explorando el catálogo
          </Link>
        </div>

        {!user && !emptyCart && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Estás comprando como visitante. Si inicias sesión con una cuenta institucional
            obtendrás el 8% de descuento adicional acumulativo.{' '}
            <Link to="/login" className="font-bold underline">
              Iniciar sesión
            </Link>
          </div>
        )}

        {emptyCart ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <h2 className="text-xl font-bold text-editorial-primary mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-600 mb-6">
              Agrega publicaciones desde el catálogo para calcular descuentos e impuestos.
            </p>
            <Link
              to="/catalog"
              className="inline-flex bg-editorial-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-editorial-secondary transition"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-editorial-primary">
                  Ítems seleccionados ({items.length})
                </h2>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 transition"
                >
                  Vaciar carrito
                </button>
              </div>

              {loadingBooks ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  Cargando datos de las obras...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-editorial-beige/60 text-editorial-primary">
                      <tr>
                        <th className="text-left font-semibold px-5 py-3">Obra</th>
                        <th className="text-right font-semibold px-3 py-3 whitespace-nowrap">
                          Precio
                        </th>
                        <th className="text-center font-semibold px-3 py-3">Cantidad</th>
                        <th className="text-right font-semibold px-3 py-3 whitespace-nowrap">
                          Subtotal
                        </th>
                        <th className="text-right font-semibold px-5 py-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detailedItems.map(({ item, book }) => {
                        const atMax = item.quantity >= book.stock;
                        return (
                          <tr key={item.bookId} className="align-middle">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3 min-w-[230px]">
                                <img
                                  src={book.coverImage}
                                  alt={book.title}
                                  className="h-20 w-14 rounded object-cover border border-gray-200"
                                />
                                <div>
                                  <Link
                                    to={`/books/${book.id}`}
                                    className="font-semibold text-editorial-primary hover:underline line-clamp-1"
                                  >
                                    {book.title}
                                  </Link>
                                  <p className="text-xs text-gray-500">{book.author}</p>
                                  <p className="text-[10px] uppercase tracking-wider text-editorial-secondary mt-1">
                                    {book.format} · {book.genre}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    Stock disponible: {book.stock}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-right whitespace-nowrap">
                              {formatQ(book.price)}
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(book.id, item.quantity - 1, book.stock)
                                    }
                                    disabled={item.quantity <= 1}
                                    className="px-2.5 py-1.5 text-editorial-primary hover:bg-editorial-beige disabled:opacity-40"
                                    aria-label={`Disminuir cantidad de ${book.title}`}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={Math.max(book.stock, 1)}
                                    value={item.quantity}
                                    onChange={(event) =>
                                      handleQuantityChange(
                                        book.id,
                                        Number(event.target.value),
                                        book.stock,
                                      )
                                    }
                                    className="w-12 text-center py-1.5 border-x border-gray-200 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(book.id, item.quantity + 1, book.stock)
                                    }
                                    disabled={atMax}
                                    className="px-2.5 py-1.5 text-editorial-primary hover:bg-editorial-beige disabled:opacity-40"
                                    aria-label={`Aumentar cantidad de ${book.title}`}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-right font-bold text-editorial-secondary whitespace-nowrap">
                              {formatQ(book.price * item.quantity)}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => removeItem(book.id)}
                                className="text-xs font-semibold text-red-600 hover:text-red-700 transition"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/60 text-xs text-gray-500">
                Los descuentos se calculan sobre el total de unidades del carrito. Los clientes
                institucionales acumulan 8% adicional después del descuento por volumen.
              </div>
            </div>

            <div className="lg:sticky lg:top-6 space-y-4">
              <OrderSummary summary={summary} calculating={calculating} />

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <Link
                  to="/checkout"
                  className={`block text-center font-bold px-5 py-3 rounded-lg shadow transition ${
                    calculating || !summary
                      ? 'bg-gray-300 text-gray-500 pointer-events-none'
                      : 'bg-editorial-primary text-white hover:bg-editorial-secondary'
                  }`}
                  aria-disabled={calculating || !summary}
                >
                  Proceder al pago
                </Link>
                <Link
                  to="/catalog"
                  className="block text-center font-semibold px-5 py-2.5 rounded-lg border border-editorial-primary/30 text-editorial-primary hover:bg-editorial-beige transition"
                >
                  Agregar más obras
                </Link>
                <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                  El total mostrado es una simulación del motor de descuentos. El pago final se
                  procesará al confirmar la orden.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <EditorialFooter />
    </div>
  );
}
