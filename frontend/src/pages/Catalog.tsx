// src/pages/Catalog.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockService, Book } from '../services/mockService';
import logoLumina from '../assets/logo.png';

export default function Catalog() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para los filtros (RF-01.2)
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('todos');
  const [selectedFormat, setSelectedFormat] = useState('todos');

  useEffect(() => {
    // TODO: Conectar con el endpoint GET /api/books del Backend
    mockService.getBooks({ 
      search, 
      genre: selectedGenre, 
      format: selectedFormat 
    }).then(data => {
      setBooks(data);
      setLoading(false);
    });
  }, [search, selectedGenre, selectedFormat]);

  return (
    <div className="min-h-screen bg-editorial-light text-editorial-dark">
      
      {/* 1. Header Institucional con el estilo Beige */}
      <header className="bg-editorial-beige text-editorial-primary shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img src={logoLumina} alt="LUMINA Logo" className="h-20 w-20 object-contain" />
            <span className="text-xs uppercase tracking-widest bg-editorial-primary text-white px-2 py-1 rounded">Editorial</span>
          </div>
          <nav className="space-x-6 hidden md:flex font-medium">
            <Link to="/" className="hover:opacity-75 transition">Inicio</Link>
            <Link to="/catalog" className="hover:opacity-75 transition font-bold underline">Catálogo</Link>
            <Link to="/custom-order" className="hover:opacity-75 transition">Cotizaciones Institucionales</Link>
            <Link to="/cart" className="hover:opacity-75 transition">Carrito</Link>
          </nav>
          <div>
            <Link to="/login" className="bg-editorial-primary text-white font-semibold px-4 py-2 rounded shadow hover:bg-opacity-90 transition">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Cabecera de la Sección */}
      <section className="bg-gradient-to-r from-editorial-primary to-[#1B4D3E] text-white py-12 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Catálogo Bibliográfico</h1>
          <p className="text-gray-200">Explora nuestro fondo editorial, publicaciones académicas y obras literarias.</p>
        </div>
      </section>

      {/* 3. RF-01.2: Panel de Búsqueda y Filtros Combinables */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          {/* Buscador por Título, Autor o ISBN */}
          <div>
            <label className="block text-sm font-semibold text-editorial-primary mb-1">Buscador en tiempo real</label>
            <input 
              type="text" 
              placeholder="Buscar por título, autor o ISBN..." 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-editorial-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro por Género */}
          <div>
            <label className="block text-sm font-semibold text-editorial-primary mb-1">Género Literario / Académico</label>
            <select 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-editorial-primary bg-white"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              <option value="todos">Todos los géneros</option>
              <option value="Tecnología">Tecnología</option>
              <option value="Historia">Historia</option>
              <option value="Ciencia">Ciencia</option>
              <option value="Literatura">Literatura</option>
              <option value="Negocios">Negocios</option>
              <option value="Arte">Arte</option>
            </select>
          </div>

          {/* Filtro por Formato (Tapa blanda, dura, e-book) */}
          <div>
            <label className="block text-sm font-semibold text-editorial-primary mb-1">Formato</label>
            <select 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-editorial-primary bg-white"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              <option value="todos">Todos los formatos</option>
              <option value="tapa blanda">Tapa blanda</option>
              <option value="tapa dura">Tapa dura</option>
              <option value="e-book">E-book</option>
            </select>
          </div>

        </div>

        {/* 4. Listado de Libros */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Cargando obras del catálogo...</div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200">
            <p className="text-lg text-gray-600">No se encontraron publicaciones con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.map(book => (
              <div key={book.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition flex flex-col justify-between">
                <div>
                  <div className="relative h-60 overflow-hidden bg-gray-100">
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                    <span className="absolute top-2 right-2 bg-editorial-primary text-white text-xs px-2.5 py-1 rounded-full uppercase font-medium">
                      {book.format}
                    </span>
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-bold text-editorial-secondary uppercase tracking-wide">
                      {book.genre}
                    </span>
                    <h3 className="font-bold text-lg text-editorial-primary mt-1 line-clamp-1">{book.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{book.author}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{book.synopsis}</p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex justify-between items-center border-t border-gray-100 mt-4">
                  <div>
                    <span className="text-xs text-gray-400 block">Precio base</span>
                    <span className="font-bold text-editorial-secondary text-lg">Q {book.price.toFixed(2)}</span>
                  </div>
                  <Link 
                    to={`/books/${book.id}`}
                    className="bg-editorial-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-editorial-secondary transition shadow"
                  >
                    Ver Ficha
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-editorial-dark text-gray-400 py-8 text-center border-t border-gray-800 mt-16">
        <p className="text-sm">&copy; 2026 LUMINA Editorial. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}