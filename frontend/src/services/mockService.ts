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
  year: number;
  edition: string;
  pages: number;
  language: string;
  publisher: string;
}

export type Role = 'visitor' | 'retail_client' | 'institutional_client' | 'sales_advisor' | 'admin';

export type UserStatus = 'activo' | 'inactivo';

export type PaymentMethod = 'tarjeta' | 'contra_entrega' | 'credito_institucional';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status?: UserStatus;
  /** Razón social de la cuenta institucional (RBAC) */
  institution?: string;
  /** NIT / documento fiscal institucional */
  nit?: string;
  /** Línea de crédito autorizada en quetzales (Q) para cuentas institucionales */
  creditLine?: number;
  /** Indica si el administrador ya validó la cuenta institucional */
  validated?: boolean;
  /** Credencial de acceso simulada (en el backend real se almacenará hasheada) */
  credential?: string;
}

export interface CreditValidationResult {
  approved: boolean;
  authorizedLine: number;
  availableLine: number;
  message: string;
}

export interface PaymentResult {
  approved: boolean;
  reference: string;
  message: string;
}

export interface CartLineInput {
  bookId: number;
  quantity: number;
}

export interface OrderCalculation {
  subtotalBase: number;
  totalUnits: number;
  volumeDiscountPercentage: number;
  volumeDiscountAmount: number;
  clientDiscountPercentage: number;
  clientDiscountAmount: number;
  taxes: number;
  totalFinal: number;
  appliedRulesDetail: string;
}

export interface OrderLine {
  bookId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type OrderStatus = 'registrada' | 'pagada' | 'en_preparacion' | 'enviada' | 'entregada';

export interface Order {
  id: number;
  userId: number;
  userName: string;
  items: OrderLine[];
  subtotalBase: number;
  volumeDiscountPercentage: number;
  volumeDiscountAmount: number;
  clientDiscountPercentage: number;
  clientDiscountAmount: number;
  taxes: number;
  totalFinal: number;
  status: OrderStatus;
  createdAt: string;
  customerType?: 'minorista' | 'institucional';
  customerNit?: string;
  customerEmail?: string;
  deliveryMethod?: string;
  deliveryLabel?: string;
  deliveryAddress?: string;
  paymentMethod?: PaymentMethod;
  paymentLabel?: string;
  purchaseOrder?: string;
  creditLineUsed?: number;
}

export type CustomOrderStatus = 'pendiente' | 'en_revision' | 'cotizada' | 'aprobada' | 'rechazada';

export interface CustomOrderRequest {
  id: number;
  userId: number;
  clientName: string;
  clientEmail: string;
  bookId: number | null;
  bookTitle: string;
  quantity: number;
  coverFinish: string;
  paperType: string;
  requiredDate: string;
  notes: string;
  status: CustomOrderStatus;
  createdAt: string;
}

export type QuoteStatus = 'emitida' | 'aprobada' | 'rechazada';

export interface Quote {
  id: number;
  requestId: number;
  advisorId: number;
  advisorName: string;
  clientName: string;
  bookTitle: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  volumeDiscountPercentage: number;
  volumeDiscountAmount: number;
  tax: number;
  total: number;
  validUntil: string;
  notes: string;
  status: QuoteStatus;
  createdAt: string;
}

// Constantes del motor comercial compartido entre la Vista y el mock del Modelo
export const IVA_RATE = 0.12;

export const getVolumeDiscountRate = (totalUnits: number): number => {
  if (totalUnits >= 6 && totalUnits <= 20) return 0.05;
  if (totalUnits >= 21 && totalUnits <= 50) return 0.1;
  if (totalUnits > 50) return 0.15;
  return 0;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const delay = (ms = 250): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Datos Semilla (Mock Books - Mínimo 10 libros requeridos por el proyecto)[cite: 5]
let mockBooks: Book[] = [
  { id: 1, title: "Arquitectura de Software Moderna", author: "Carlos M. Albarrán", isbn: "978-99923-0-123-1", price: 150.00, stock: 45, genre: "Tecnología", format: "tapa dura", synopsis: "Guía completa sobre patrones arquitectónicos y microservicios.", coverImage: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80", year: 2024, edition: "3a edición", pages: 420, language: "Español", publisher: "LUMINA Editorial" },
  { id: 2, title: "Compiladores: Principios y Práctica", author: "Ana Lucía Fuentes", isbn: "978-99923-0-124-8", price: 210.00, stock: 12, genre: "Tecnología", format: "tapa blanda", synopsis: "Análisis léxico, sintáctico y construcción de árboles de sintaxis.", coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80", year: 2023, edition: "2a edición", pages: 512, language: "Español", publisher: "LUMINA Académica" },
  { id: 3, title: "Historia de Quetzaltenango", author: "Mario Roberto Morales", isbn: "978-99923-0-125-5", price: 95.00, stock: 8, genre: "Historia", format: "tapa dura", synopsis: "Recuento histórico, cultural y arquitectónico de la ciudad de los Altos.", coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80", year: 2021, edition: "1a edición", pages: 368, language: "Español", publisher: "LUMINA Editorial" },
  { id: 4, title: "Matemáticas Discretas para Ingeniería", author: "Héctor J. Pineda", isbn: "978-99923-0-126-2", price: 180.00, stock: 30, genre: "Ciencia", format: "tapa blanda", synopsis: "Lógica proposicional, teoría de conjuntos y grafos aplicados.", coverImage: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=400&q=80", year: 2025, edition: "4a edición", pages: 448, language: "Español", publisher: "LUMINA Académica" },
  { id: 5, title: "Bases de Datos Avanzadas y T-SQL", author: "Andrea Cáceres", isbn: "978-99923-0-127-9", price: 225.00, stock: 55, genre: "Tecnología", format: "e-book", synopsis: "Optimización de consultas relacionales y administración de motores.", coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80", year: 2024, edition: "2a edición", pages: 560, language: "Español", publisher: "LUMINA Académica" },
  { id: 6, title: "Poesía de la Tierra", author: "Humberto Ak'abal", isbn: "978-99923-0-128-6", price: 75.00, stock: 20, genre: "Literatura", format: "tapa blanda", synopsis: "Antología poética bilingüe inspirada en la cosmovisión maya.", coverImage: "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?auto=format&fit=crop&w=400&q=80", year: 2019, edition: "Edición bilingüe", pages: 184, language: "Español / K'iche'", publisher: "LUMINA Editorial" },
  { id: 7, title: "Redes de Computadoras y Enrutamiento", author: "Estuardo Mendoza", isbn: "978-99923-0-129-3", price: 240.00, stock: 15, genre: "Tecnología", format: "tapa dura", synopsis: "Diseño de topologías LAN/WAN, protocolos IP y seguridad en pfSense.", coverImage: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=400&q=80", year: 2022, edition: "3a edición", pages: 496, language: "Español", publisher: "LUMINA Académica" },
  { id: 8, title: "Gestión de Proyectos con Scrum", author: "Claudia Ramírez", isbn: "978-99923-0-130-9", price: 120.00, stock: 40, genre: "Negocios", format: "e-book", synopsis: "Frameworks ágiles para el desarrollo de software en equipos multidisciplinarios.", coverImage: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80", year: 2025, edition: "1a edición", pages: 312, language: "Español", publisher: "LUMINA Editorial" },
  { id: 9, title: "Estructuras de Datos en C# y Java", author: "Roberto Gómez", isbn: "978-99923-0-131-6", price: 190.00, stock: 25, genre: "Tecnología", format: "tapa blanda", synopsis: "Implementación de pilas, colas, árboles binarios y tablas hash.", coverImage: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=80", year: 2023, edition: "2a edición", pages: 528, language: "Español", publisher: "LUMINA Académica" },
  { id: 10, title: "Introducción al Diseño Gráfico Editorial", author: "Margaby S.", isbn: "978-99923-0-132-3", price: 165.00, stock: 18, genre: "Arte", format: "tapa dura", synopsis: "Maquetación, teoría del color, tipografía y flujos de preimpresión.", coverImage: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=400&q=80", year: 2024, edition: "1a edición", pages: 296, language: "Español", publisher: "LUMINA Editorial" },
];

// 2. Usuarios Simulados para los 5 Roles del Sistema[cite: 3]
export const mockUsers: User[] = [
  { id: 1, name: "Visitante Anónimo", email: "visitor@editorial.com", role: "visitor", status: "activo" },
  { id: 2, name: "Juan Pérez", email: "juan@gmail.com", role: "retail_client", status: "activo" },
  {
    id: 3,
    name: "Universidad Mesoamericana",
    email: "compras@umes.edu.gt",
    role: "institutional_client",
    status: "activo",
    institution: "Universidad Mesoamericana",
    nit: "1023456-7",
    creditLine: 50000,
    validated: true,
    credential: "umes2026",
  },
  { id: 4, name: "Lic. Sofía Asesor", email: "asesor@editorial.com", role: "sales_advisor", status: "activo", credential: "asesor2026" },
  { id: 5, name: "Admin General", email: "admin@editorial.com", role: "admin", status: "activo", credential: "admin2026" },
  {
    id: 6,
    name: "Colegio San José de los Altos",
    email: "compras@csj.edu.gt",
    role: "institutional_client",
    status: "activo",
    institution: "Colegio San José de los Altos",
    nit: "5061234-9",
    creditLine: 20000,
    validated: false,
    credential: "csj2026",
  },
  {
    id: 7,
    name: "Lic. Mario Estupe",
    email: "mario.estupe@editorial.com",
    role: "sales_advisor",
    status: "inactivo",
    credential: "mario2026",
  },
];

// 3. Solicitudes institucionales semilla (RF-04)
let mockCustomOrders: CustomOrderRequest[] = [
  {
    id: 1,
    userId: 3,
    clientName: "Universidad Mesoamericana",
    clientEmail: "compras@umes.edu.gt",
    bookId: 3,
    bookTitle: "Historia de Quetzaltenango",
    quantity: 60,
    coverFinish: "Tapa dura con estampado dorado",
    paperType: "Papel bond 80g",
    requiredDate: "2026-12-15",
    notes: "Edición conmemorativa para el 50 aniversario de la facultad.",
    status: "pendiente",
    createdAt: "2026-11-02T10:30:00.000Z",
  },
  {
    id: 2,
    userId: 3,
    clientName: "Universidad Mesoamericana",
    clientEmail: "compras@umes.edu.gt",
    bookId: 4,
    bookTitle: "Matemáticas Discretas para Ingeniería",
    quantity: 35,
    coverFinish: "Tapa blanda laminada mate",
    paperType: "Papel couché 150g",
    requiredDate: "2026-12-20",
    notes: "Uso como texto guía para el ciclo académico 2027.",
    status: "en_revision",
    createdAt: "2026-11-04T14:15:00.000Z",
  },
  {
    id: 3,
    userId: 2,
    clientName: "Juan Pérez",
    clientEmail: "juan@gmail.com",
    bookId: 6,
    bookTitle: "Poesía de la Tierra",
    quantity: 120,
    coverFinish: "Tapa dura con sobrecubierta",
    paperType: "Papel ahuesado 75g",
    requiredDate: "2027-01-10",
    notes: "Antología para bibliotecas escolares del área rural.",
    status: "cotizada",
    createdAt: "2026-10-28T09:00:00.000Z",
  },
  {
    id: 4,
    userId: 3,
    clientName: "Universidad Mesoamericana",
    clientEmail: "compras@umes.edu.gt",
    bookId: 1,
    bookTitle: "Arquitectura de Software Moderna",
    quantity: 25,
    coverFinish: "Tapa dura con foil dorado",
    paperType: "Papel bond 80g",
    requiredDate: "2026-12-05",
    notes: "Solicitud aprobada para el programa de posgrado.",
    status: "aprobada",
    createdAt: "2026-10-20T11:45:00.000Z",
  },
];

// 4. Cotizaciones formales semilla (RF-05)
let mockQuotes: Quote[] = [
  {
    id: 1,
    requestId: 3,
    advisorId: 4,
    advisorName: "Lic. Sofía Asesor",
    clientName: "Juan Pérez",
    bookTitle: "Poesía de la Tierra",
    quantity: 120,
    unitPrice: 75,
    subtotal: 7650,
    volumeDiscountPercentage: 15,
    volumeDiscountAmount: 1350,
    tax: 918,
    total: 8568,
    validUntil: "2026-11-30",
    notes: "Incluye empaque especial para distribución escolar.",
    status: "emitida",
    createdAt: "2026-10-30T16:20:00.000Z",
  },
];

let mockOrders: Order[] = [];

const nextBookId = (): number => Math.max(0, ...mockBooks.map((book) => book.id)) + 1;
const nextCustomOrderId = (): number => Math.max(0, ...mockCustomOrders.map((request) => request.id)) + 1;
const nextQuoteId = (): number => Math.max(0, ...mockQuotes.map((quote) => quote.id)) + 1;
const nextOrderId = (): number => Math.max(0, ...mockOrders.map((order) => order.id)) + 1;
const nextUserId = (): number => Math.max(0, ...mockUsers.map((user) => user.id)) + 1;

// Motor de descuentos compartido: volumen (1-5: 0%, 6-20: 5%, 21-50: 10%, >50: 15%)
// y 8% adicional acumulativo para clientes institucionales.
const calculateOrderSummary = (items: CartLineInput[], userRole: Role): OrderCalculation => {
  let subtotalBase = 0;
  let totalUnits = 0;

  items.forEach((item) => {
    const book = mockBooks.find((candidate) => candidate.id === item.bookId);
    if (book) {
      subtotalBase += book.price * item.quantity;
      totalUnits += item.quantity;
    }
  });

  const volumeDiscountPercentage = getVolumeDiscountRate(totalUnits) * 100;
  const volumeDiscountAmount = subtotalBase * (volumeDiscountPercentage / 100);
  const subtotalAfterVolume = subtotalBase - volumeDiscountAmount;

  const clientDiscountPercentage = userRole === 'institutional_client' ? 8 : 0;
  const clientDiscountAmount = subtotalAfterVolume * (clientDiscountPercentage / 100);

  const taxableAmount = subtotalAfterVolume - clientDiscountAmount;
  const taxes = taxableAmount * IVA_RATE;
  const totalFinal = taxableAmount + taxes;

  return {
    subtotalBase: round2(subtotalBase),
    totalUnits,
    volumeDiscountPercentage,
    volumeDiscountAmount: round2(volumeDiscountAmount),
    clientDiscountPercentage,
    clientDiscountAmount: round2(clientDiscountAmount),
    taxes: round2(taxes),
    totalFinal: round2(totalFinal),
    appliedRulesDetail: `Volumen: ${totalUnits} unidades (${volumeDiscountPercentage}% desc). Cliente: ${
      userRole === 'institutional_client' ? 'Institucional (8% adicional)' : 'Minorista (0%)'
    }`,
  };
};

// 5. Funciones simuladas que imitan peticiones asíncronas (con un pequeño delay)
export const mockService = {
  // Obtener libros con filtros opcionales
  getBooks: async (filters?: { search?: string; genre?: string; format?: string }) => {
    // TODO: Conectar con el Controlador/Backend → GET /api/books
    await delay(300);
    let result = [...mockBooks];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          book.isbn.includes(q),
      );
    }
    if (filters?.genre && filters.genre !== 'todos') {
      const genreFilter = filters.genre.toLowerCase();
      result = result.filter((book) => book.genre.toLowerCase() === genreFilter);
    }
    if (filters?.format && filters.format !== 'todos') {
      result = result.filter((book) => book.format === filters.format);
    }
    return result;
  },

  getBookById: async (id: number) => {
    // TODO: Conectar con el Controlador/Backend → GET /api/books/:id
    await delay(200);
    return mockBooks.find((book) => book.id === id) ?? null;
  },

  // MOTOR DE DESCUENTOS SIMULADO (Simulando la lógica que irá en el Modelo del Backend)[cite: 3]
  calculateOrder: async (items: CartLineInput[], userRole: Role): Promise<OrderCalculation> => {
    // TODO: Conectar con el Controlador/Backend → POST /api/orders/calculate
    await delay(300);
    return calculateOrderSummary(items, userRole);
  },

  createOrder: async (payload: {
    items: CartLineInput[];
    userRole: Role;
    userId: number;
    userName: string;
    customerType?: 'minorista' | 'institucional';
    customerNit?: string;
    customerEmail?: string;
    deliveryMethod?: string;
    deliveryLabel?: string;
    deliveryAddress?: string;
    paymentMethod?: PaymentMethod;
    paymentLabel?: string;
    purchaseOrder?: string;
    creditLineUsed?: number;
  }): Promise<Order> => {
    // TODO: Conectar con el Controlador/Backend → POST /api/orders
    await delay(400);
    const summary = calculateOrderSummary(payload.items, payload.userRole);
    const orderItems = payload.items.flatMap((item): OrderLine[] => {
      const book = mockBooks.find((candidate) => candidate.id === item.bookId);
      if (!book) return [];
      return [
        {
          bookId: book.id,
          title: book.title,
          quantity: item.quantity,
          unitPrice: book.price,
          subtotal: round2(book.price * item.quantity),
        },
      ];
    });

    const order: Order = {
      id: nextOrderId(),
      userId: payload.userId,
      userName: payload.userName,
      items: orderItems,
      subtotalBase: summary.subtotalBase,
      volumeDiscountPercentage: summary.volumeDiscountPercentage,
      volumeDiscountAmount: summary.volumeDiscountAmount,
      clientDiscountPercentage: summary.clientDiscountPercentage,
      clientDiscountAmount: summary.clientDiscountAmount,
      taxes: summary.taxes,
      totalFinal: summary.totalFinal,
      status: 'registrada',
      createdAt: new Date().toISOString(),
      customerType: payload.customerType,
      customerNit: payload.customerNit,
      customerEmail: payload.customerEmail,
      deliveryMethod: payload.deliveryMethod,
      deliveryLabel: payload.deliveryLabel,
      deliveryAddress: payload.deliveryAddress,
      paymentMethod: payload.paymentMethod,
      paymentLabel: payload.paymentLabel,
      purchaseOrder: payload.purchaseOrder,
      creditLineUsed: payload.creditLineUsed,
    };

    mockOrders.push(order);
    return order;
  },

  getOrders: async (): Promise<Order[]> => {
    // TODO: Conectar con el Controlador/Backend → GET /api/orders
    await delay(200);
    return [...mockOrders];
  },

  // Pasarela de pago simulada (tarjeta / contra entrega / crédito institucional)
  processPayment: async (payload: {
    method: PaymentMethod;
    amount: number;
    reference?: string;
  }): Promise<PaymentResult> => {
    // TODO: Conectar con el Controlador/Backend → POST /api/payments
    await delay(500);
    const reference =
      payload.reference ?? `PAY-${Date.now().toString().slice(-8)}`;

    if (payload.amount <= 0) {
      return {
        approved: false,
        reference,
        message: 'El monto a pagar debe ser mayor a cero.',
      };
    }

    return {
      approved: true,
      reference,
      message:
        payload.method === 'tarjeta'
          ? 'Pago con tarjeta autorizado correctamente.'
          : payload.method === 'credito_institucional'
            ? 'Cargo a la línea de crédito institucional autorizado.'
            : 'Orden registrada para pago contra entrega.',
    };
  },

  // Valida la línea de crédito y orden de compra de una cuenta institucional
  validateInstitutionalCredit: async (payload: {
    userId: number;
    amount: number;
    purchaseOrder: string;
  }): Promise<CreditValidationResult> => {
    // TODO: Conectar con el Controlador/Backend → POST /api/institutional-credit/validate
    await delay(450);
    const account = mockUsers.find((candidate) => candidate.id === payload.userId);
    const authorizedLine = account?.creditLine ?? 0;
    const availableLine = Math.max(0, round2(authorizedLine - payload.amount));

    if (!account || account.role !== 'institutional_client') {
      return {
        approved: false,
        authorizedLine,
        availableLine,
        message: 'La cuenta no corresponde a un cliente institucional.',
      };
    }
    if (!account.validated) {
      return {
        approved: false,
        authorizedLine,
        availableLine,
        message: 'La cuenta institucional aún no ha sido validada por el administrador.',
      };
    }
    if (!payload.purchaseOrder.trim()) {
      return {
        approved: false,
        authorizedLine,
        availableLine,
        message: 'Debes ingresar el número de orden de compra.',
      };
    }
    if (payload.amount > authorizedLine) {
      return {
        approved: false,
        authorizedLine,
        availableLine,
        message: `El monto excede la línea de crédito autorizada (${authorizedLine.toFixed(2)}).`,
      };
    }

    return {
      approved: true,
      authorizedLine,
      availableLine,
      message: 'Línea de crédito y orden de compra validadas correctamente.',
    };
  },

  // RBAC: gestión de cuentas institucionales y asesores de ventas
  getManagedUsers: async (): Promise<User[]> => {
    // TODO: Conectar con el Controlador/Backend → GET /api/admin/users
    await delay(250);
    return mockUsers.filter(
      (user) => user.role === 'institutional_client' || user.role === 'sales_advisor',
    );
  },

  createManagedUser: async (payload: Omit<User, 'id'>): Promise<User> => {
    // TODO: Conectar con el Controlador/Backend → POST /api/admin/users
    await delay(300);
    const user: User = { ...payload, id: nextUserId() };
    mockUsers.push(user);
    return user;
  },

  updateManagedUser: async (
    id: number,
    updates: Partial<Omit<User, 'id'>>,
  ): Promise<User | null> => {
    // TODO: Conectar con el Controlador/Backend → PUT /api/admin/users/:id
    await delay(300);
    const index = mockUsers.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const updatedUser: User = { ...mockUsers[index], ...updates, id };
    mockUsers[index] = updatedUser;
    return updatedUser;
  },

  deleteManagedUser: async (id: number): Promise<boolean> => {
    // TODO: Conectar con el Controlador/Backend → DELETE /api/admin/users/:id
    await delay(300);
    const index = mockUsers.findIndex(
      (user) =>
        user.id === id &&
        (user.role === 'institutional_client' || user.role === 'sales_advisor'),
    );
    if (index === -1) return false;
    mockUsers.splice(index, 1);
    return true;
  },

  // CRUD Admin Simulado
  addBook: async (newBook: Omit<Book, 'id'>) => {
    // TODO: Conectar con el Controlador/Backend → POST /api/books
    await delay(250);
    const book: Book = { ...newBook, id: nextBookId() };
    mockBooks.push(book);
    return book;
  },

  updateBook: async (id: number, updates: Partial<Omit<Book, 'id'>>) => {
    // TODO: Conectar con el Controlador/Backend → PUT /api/books/:id
    await delay(250);
    const index = mockBooks.findIndex((book) => book.id === id);
    if (index === -1) return null;
    const updatedBook: Book = { ...mockBooks[index], ...updates, id };
    mockBooks[index] = updatedBook;
    return updatedBook;
  },

  deleteBook: async (id: number) => {
    // TODO: Conectar con el Controlador/Backend → DELETE /api/books/:id
    await delay(250);
    const exists = mockBooks.some((book) => book.id === id);
    mockBooks = mockBooks.filter((book) => book.id !== id);
    return exists;
  },

  updateStock: async (id: number, stock: number) => {
    // TODO: Conectar con el Controlador/Backend → PATCH /api/books/:id/stock
    await delay(150);
    const index = mockBooks.findIndex((book) => book.id === id);
    if (index === -1) return null;
    const updatedBook: Book = { ...mockBooks[index], stock: Math.max(0, Math.floor(stock)) };
    mockBooks[index] = updatedBook;
    return updatedBook;
  },

  // RF-04: Solicitudes de pedidos personalizados / cotizaciones
  getCustomOrders: async (status?: CustomOrderStatus | 'todas'): Promise<CustomOrderRequest[]> => {
    // TODO: Conectar con el Controlador/Backend → GET /api/custom-orders
    await delay(250);
    const result =
      status && status !== 'todas'
        ? mockCustomOrders.filter((request) => request.status === status)
        : [...mockCustomOrders];
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  createCustomOrder: async (
    payload: Omit<CustomOrderRequest, 'id' | 'status' | 'createdAt'>,
  ): Promise<CustomOrderRequest> => {
    // TODO: Conectar con el Controlador/Backend → POST /api/custom-orders
    await delay(350);
    const request: CustomOrderRequest = {
      ...payload,
      id: nextCustomOrderId(),
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    };
    mockCustomOrders.push(request);
    return request;
  },

  updateCustomOrderStatus: async (
    id: number,
    status: CustomOrderStatus,
  ): Promise<CustomOrderRequest | null> => {
    // TODO: Conectar con el Controlador/Backend → PATCH /api/custom-orders/:id/status
    await delay(250);
    const index = mockCustomOrders.findIndex((request) => request.id === id);
    if (index === -1) return null;
    const updatedRequest: CustomOrderRequest = { ...mockCustomOrders[index], status };
    mockCustomOrders[index] = updatedRequest;
    return updatedRequest;
  },

  // RF-05: Cotizaciones formales emitidas por el asesor
  getQuotes: async (): Promise<Quote[]> => {
    // TODO: Conectar con el Controlador/Backend → GET /api/quotes
    await delay(250);
    return [...mockQuotes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  createQuote: async (payload: Omit<Quote, 'id' | 'status' | 'createdAt'>): Promise<Quote> => {
    // TODO: Conectar con el Controlador/Backend → POST /api/quotes
    await delay(350);
    const quote: Quote = {
      ...payload,
      id: nextQuoteId(),
      status: 'emitida',
      createdAt: new Date().toISOString(),
    };
    mockQuotes.push(quote);

    const requestIndex = mockCustomOrders.findIndex((request) => request.id === quote.requestId);
    if (requestIndex !== -1) {
      mockCustomOrders[requestIndex] = { ...mockCustomOrders[requestIndex], status: 'cotizada' };
    }

    return quote;
  },

  updateQuoteStatus: async (id: number, status: QuoteStatus): Promise<Quote | null> => {
    // TODO: Conectar con el Controlador/Backend → PATCH /api/quotes/:id/status
    await delay(250);
    const index = mockQuotes.findIndex((quote) => quote.id === id);
    if (index === -1) return null;
    const updatedQuote: Quote = { ...mockQuotes[index], status };
    mockQuotes[index] = updatedQuote;

    if (status === 'aprobada' || status === 'rechazada') {
      const requestIndex = mockCustomOrders.findIndex(
        (request) => request.id === updatedQuote.requestId,
      );
      if (requestIndex !== -1) {
        mockCustomOrders[requestIndex] = {
          ...mockCustomOrders[requestIndex],
          status: status === 'aprobada' ? 'aprobada' : 'rechazada',
        };
      }
    }

    return updatedQuote;
  },
};
