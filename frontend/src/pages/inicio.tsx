// src/pages/Inicio.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockService, Book } from '../services/mockService';
import logoLumina from '../assets/logo.png';

export default function Inicio() {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulamos la carga de publicaciones destacadas desde el servicio
    mockService.getBooks().then(data => {
      // Tomamos los primeros 4 libros como destacados/novedades
      setFeaturedBooks(data.slice(0, 4));
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-editorial-light text-editorial-dark">
      
 {/* 1. Header / Barra de Navegación Rápida */}
<header className="bg-editorial-beige text-editorial-primary shadow-md">
  <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
    
    {/* Logo y Nombre */}
    <div className="flex items-center space-x-2">
      <img src={logoLumina} alt="LUMINA Logo" className="h-20 w-20 object-contain" />
      <span className="text-xs uppercase tracking-widest bg-editorial-primary text-white px-2 py-1 rounded">Editorial</span>
    </div>

    {/* Enlaces de Navegación (ahora con texto oscuro para que contrasten bien con el fondo beige) */}
    <nav className="space-x-6 hidden md:flex font-medium">
      <Link to="/" className="hover:opacity-75 transition">Inicio</Link>
      <Link to="/catalog" className="hover:opacity-75 transition">Catálogo</Link>
      <Link to="/custom-order" className="hover:opacity-75 transition">Cotizaciones Institucionales</Link>
      <Link to="/cart" className="hover:opacity-75 transition">Carrito</Link>
    </nav>

    {/* Botón de Iniciar Sesión */}
    <div>
      <Link to="/login" className="bg-editorial-primary text-white font-semibold px-4 py-2 rounded shadow hover:bg-opacity-90 transition">
        Iniciar Sesión
      </Link>
    </div>

  </div>
</header>
      <section className="bg-gradient-to-r from-editorial-primary to-editorial-secondary text-white py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Plataforma Editorial <span className="text-editorial-accent">LUMINA</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Gestión, comercialización y cotización personalizada de fondos bibliográficos tradicionales e institucionales.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              to="/catalog" 
              className="bg-editorial-accent text-editorial-primary font-bold px-6 py-3 rounded-lg shadow-lg hover:bg-opacity-90 transition"
            >
              Explorar Catálogo
            </Link>
            <Link 
              to="/custom-order" 
              className="bg-transparent border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-white hover:text-editorial-primary transition"
            >
              Solicitar Cotización Mayorista
            </Link>
          </div>
        </div>
      </section>

      {/* 3. RF-01.1: Publicaciones Destacadas y Novedades del Mes */}
      <section className="max-w-7xl mx-auto py-16 px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-editorial-primary">Publicaciones Destacadas</h2>
            <p className="text-gray-600">Descubre las obras más solicitadas por nuestra comunidad académica y literaria.</p>
          </div>
          <Link to="/catalog" className="text-editorial-secondary font-semibold hover:underline">
            Ver todo el catálogo &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando publicaciones...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {featuredBooks.map(book => (
              <div key={book.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition flex flex-col justify-between">
                <div>
                  <img src={book.coverImage} alt={book.title} className="h-56 w-full object-cover" />
                  <div className="p-4">
                    <span className="text-xs uppercase font-semibold text-editorial-accent bg-editorial-primary/10 px-2 py-0.5 rounded">
                      {book.genre}
                    </span>
                    <h3 className="font-bold text-lg text-editorial-primary mt-2 line-clamp-1">{book.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{book.author}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{book.synopsis}</p>
                  </div>
                </div>
                <div className="p-4 pt-0 flex justify-between items-center border-t border-gray-100 mt-4">
                  <span className="font-bold text-editorial-secondary text-lg">Q {book.price.toFixed(2)}</span>
                  <Link 
                    to={`/books/${book.id}`}
                    className="bg-editorial-primary text-white text-sm px-3 py-1.5 rounded hover:bg-editorial-secondary transition"
                  >
                    Ver Detalle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Footer Institucional */}
      <footer className="bg-editorial-dark text-gray-400 py-8 text-center border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">&copy; 2026 LUMINA Editorial. Todos los derechos reservados.</p>
          <p className="text-xs text-gray-500 mt-2">Sistema desarrollado bajo Arquitectura MVC - Proyecto Final.</p>
        </div>
      </footer>

    </div>
  );
}