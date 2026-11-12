import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoLumina from '../assets/logo.png';
import { useCart } from '../context/CartContext';
import { clearSession, getCurrentUser } from '../utils/session';

interface NavItem {
  to: string;
  label: string;
  active: boolean;
  badge?: number;
}

const linkClass = (active: boolean): string =>
  `transition hover:opacity-75 ${active ? 'font-bold underline underline-offset-4' : ''}`;

export function EditorialHeader() {
  const { totalItems, clearCart } = useCart();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const isCatalog = pathname.startsWith('/catalog') || pathname.startsWith('/books');
  const isCustomOrder = pathname.startsWith('/custom-order');
  const isCart = pathname.startsWith('/cart') || pathname.startsWith('/checkout');
  const isAdmin = pathname.startsWith('/admin');
  const isAdvisor = pathname.startsWith('/advisor');

  const navItems: NavItem[] = [
    { to: '/', label: 'Inicio', active: pathname === '/' },
    { to: '/catalog', label: 'Catálogo', active: isCatalog },
  ];

  if (user?.role === 'retail_client' || user?.role === 'institutional_client') {
    navItems.push(
      { to: '/custom-order', label: 'Cotizaciones', active: isCustomOrder },
      { to: '/cart', label: 'Carrito', active: isCart, badge: totalItems },
    );
  }

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin/books', label: 'Administración', active: isAdmin });
  }
  if (user?.role === 'sales_advisor') {
    navItems.push({ to: '/advisor/quotes', label: 'Asesor de Ventas', active: isAdvisor });
  }

  const handleLogout = () => {
    clearCart();
    clearSession();
    navigate('/');
  };

  const renderNavItem = (item: NavItem, mobile = false) => (
    <Link key={item.to} to={item.to} className={`relative shrink-0 ${linkClass(item.active)}`}>
      {item.label}
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={`absolute inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-editorial-primary px-1.5 font-bold text-white ${
            mobile ? '-top-2 -right-3 text-[9px]' : '-top-2 -right-4 text-[10px]'
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );

  return (
    <header className="bg-editorial-beige text-editorial-primary shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center gap-4">
        <Link to="/" className="flex items-center space-x-2 shrink-0">
          <img src={logoLumina} alt="LUMINA Logo" className="h-16 w-16 md:h-20 md:w-20 object-contain" />
          <span className="text-xs uppercase tracking-widest bg-editorial-primary text-white px-2 py-1 rounded">
            Editorial
          </span>
        </Link>

        <nav className="space-x-5 hidden lg:flex items-center font-medium text-sm">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {user ? (
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-sm font-semibold text-editorial-primary">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-editorial-secondary">
                {user.role.replace('_', ' ')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="border border-editorial-primary/30 text-editorial-primary font-semibold px-3 py-2 rounded-lg text-sm hover:bg-editorial-primary hover:text-white transition"
            >
              Salir
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-editorial-primary text-white font-semibold px-4 py-2 rounded shadow hover:bg-opacity-90 transition shrink-0"
          >
            Iniciar Sesión
          </Link>
        )}
      </div>

      <div className="lg:hidden border-t border-editorial-primary/10">
        <nav className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-5 overflow-x-auto text-xs font-semibold whitespace-nowrap">
          {navItems.map((item) => renderNavItem(item, true))}
        </nav>
      </div>
    </header>
  );
}
