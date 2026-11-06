// src/services/mockService.ts

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  price: number;
  stock: number;
  genre: string;
  format: 'tapa blanda' | 'tapa dura' | 'e-book';
  synopsis: string;
  coverImage: string;
}

export type Role = 'visitor' | 'retail_client' | 'institutional_client' | 'sales_advisor' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

// 1. Datos Semilla (Mock Books - Mínimo 10 libros requeridos por el proyecto)[cite: 5]
let mockBooks: Book[] = [
  { id: 1, title: "Arquitectura de Software Moderna", author: "Carlos M. Albarrán", isbn: "978-99923-0-123-1", price: 150.00, stock: 45, genre: "Tecnología", format: "tapa dura", synopsis: "Guía completa sobre patrones arquitectónicos y microservicios.", coverImage: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80" },
  { id: 2, title: "Compiladores: Principios y Práctica", author: "Ana Lucía Fuentes", isbn: "978-99923-0-124-8", price: 210.00, stock: 12, genre: "Tecnología", format: "tapa blanda", synopsis: "Análisis léxico, sintáctico y construcción de árboles de sintaxis.", coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80" },
  { id: 3, title: "Historia de Quetzaltenango", author: "Mario Roberto Morales", isbn: "978-99923-0-125-5", price: 95.00, stock: 8, genre: "Historia", format: "tapa dura", synopsis: "Recuento histórico, cultural y arquitectónico de la ciudad de los Altos.", coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80" },
  { id: 4, title: "Matemáticas Discretas para Ingeniería", author: "Héctor J. Pineda", isbn: "978-99923-0-126-2", price: 180.00, stock: 30, genre: "Ciencia", format: "tapa blanda", synopsis: "Lógica proposicional, teoría de conjuntos y grafos aplicados.", coverImage: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80" },
  { id: 5, title: "Bases de Datos Avanzadas y T-SQL", author: "Andrea Cáceres", isbn: "978-99923-0-127-9", price: 225.00, stock: 55, genre: "Tecnología", format: "e-book", synopsis: "Optimización de consultas relacionales y administración de motores.", coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80" },
  { id: 6, title: "Poesía de la Tierra", author: "Humberto Ak'abal", isbn: "978-99923-0-128-6", price: 75.00, stock: 20, genre: "Literatura", format: "tapa blanda", synopsis: "Antología poética bilingüe inspirada en la cosmovisión maya.", coverImage: "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?auto=format&fit=crop&w=400&q=80" },
  { id: 7, title: "Redes de Computadoras y Enrutamiento", author: "Estuardo Mendoza", isbn: "978-99923-0-129-3", price: 240.00, stock: 15, genre: "Tecnología", format: "tapa dura", synopsis: "Diseño de topologías LAN/WAN, protocolos IP y seguridad en pfSense.", coverImage: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=400&q=80" },
  { id: 8, title: "Gestión de Proyectos con Scrum", author: "Claudia Ramírez", isbn: "978-99923-0-130-9", price: 120.00, stock: 40, genre: "Negocios", format: "e-book", synopsis: "Frameworks ágiles para el desarrollo de software en equipos multidisciplinarios.", coverImage: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80" },
  { id: 9, title: "Estructuras de Datos en C# y Java", author: "Roberto Gómez", isbn: "978-99923-0-131-6", price: 190.00, stock: 25, genre: "Tecnología", format: "tapa blanda", synopsis: "Implementación de pilas, colas, árboles binarios y tablas hash.", coverImage: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=80" },
  { id: 10, title: "Introducción al Diseño Gráfico Editorial", author: "Margaby S.", isbn: "978-99923-0-132-3", price: 165.00, stock: 18, genre: "Arte", format: "tapa dura", synopsis: "Maquetación, teoría del color, tipografía y flujos de preimpresión.", coverImage: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=400&q=80" },
];

// 2. Usuarios Simulados para los 5 Roles del Sistema[cite: 3]
export const mockUsers: User[] = [
  { id: 1, name: "Visitante Anónimo", email: "visitor@editorial.com", role: "visitor" },
  { id: 2, name: "Juan Pérez (Cliente Minorista)", email: "juan@gmail.com", role: "retail_client" },
  { id: 3, name: "Universidad Mesoamericana (Institucional)", email: "compras@umes.edu.gt", role: "institutional_client" },
  { id: 4, name: "Lic. Sofía Asesor (Ventas)", email: "asesor@editorial.com", role: "sales_advisor" },
  { id: 5, name: "Admin General", email: "admin@editorial.com", role: "admin" },
];

// 3. Funciones simuladas que imitan peticiones asíncronas (con un pequeño delay)
export const mockService = {
// Obtener libros con filtros opcionales 
  getBooks: async (filters?: { search?: string; genre?: string; format?: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    let result = [...mockBooks];
    
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q));
    }
    if (filters?.genre && filters.genre !== 'todos') {
      const genreFilter = filters.genre.toLowerCase();
      result = result.filter(b => b.genre.toLowerCase() === genreFilter);
    }
    if (filters?.format && filters.format !== 'todos') {
      result = result.filter(b => b.format === filters.format);
    }
    return result;
  },

  getBookById: async (id: number) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockBooks.find(b => b.id === id) || null;
  },

  // MOTOR DE DESCUENTOS SIMULADO (Simulando la lógica que irá en el Modelo del Backend)[cite: 3]
  calculateOrder: async (items: { bookId: number; quantity: number }[], userRole: Role) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    let subtotalBase = 0;
    let totalUnits = 0;

    items.forEach(item => {
      const book = mockBooks.find(b => b.id === item.bookId);
      if (book) {
        subtotalBase += book.price * item.quantity;
        totalUnits += item.quantity;
      }
    });

    // Regla 1: Descuento por Volumen[cite: 3]
    let volumeDiscountPercentage = 0;
    if (totalUnits >= 6 && totalUnits <= 20) volumeDiscountPercentage = 0.05;      // 5%
    else if (totalUnits >= 21 && totalUnits <= 50) volumeDiscountPercentage = 0.10; // 10%
    else if (totalUnits > 50) volumeDiscountPercentage = 0.15;                      // 15%

    const volumeDiscountAmount = subtotalBase * volumeDiscountPercentage;
    const subtotalAfterVolume = subtotalBase - volumeDiscountAmount;

    // Regla 2: Descuento Adicional por Tipo de Cliente[cite: 3]
    let clientDiscountPercentage = 0;
    if (userRole === 'institutional_client') {
      clientDiscountPercentage = 0.08; // 8% adicional acumulativo[cite: 3]
    }
    const clientDiscountAmount = subtotalAfterVolume * clientDiscountPercentage;
    
    const taxableAmount = subtotalAfterVolume - clientDiscountAmount;
    const taxes = taxableAmount * 0.12; // 12% IVA estándar
    const totalFinal = taxableAmount + taxes;

    return {
      subtotalBase,
      totalUnits,
      volumeDiscountPercentage: volumeDiscountPercentage * 100,
      volumeDiscountAmount,
      clientDiscountPercentage: clientDiscountPercentage * 100,
      clientDiscountAmount,
      taxes,
      totalFinal,
      appliedRulesDetail: `Volumen: ${totalUnits} unidades (${volumeDiscountPercentage * 100}% desc). Cliente: ${userRole === 'institutional_client' ? 'Institucional (8% adic.)' : 'Minorista (0%)'}`
    };
  },

  // CRUD Admin Simulado
  addBook: async (newBook: Omit<Book, 'id'>) => {
    const book: Book = { ...newBook, id: mockBooks.length + 1 };
    mockBooks.push(book);
    return book;
  }
};