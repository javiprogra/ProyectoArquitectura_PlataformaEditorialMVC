// TODO(vista): configurar aquí el router y los layouts/páginas
import { AppRouter } from './router/AppRouter';
import { CartProvider } from './context/CartContext';

export default function App() {
  return (
    <CartProvider>
      <div className="bg-editorial-light min-h-screen">
        <AppRouter />
      </div>
    </CartProvider>
  );
}
