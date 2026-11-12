// Tipos compartidos entre la Vista y el Backend (contratos de la API).

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

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
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

export type OrderStatus = 'registrada' | 'pagada' | 'en_preparacion' | 'enviada' | 'entregada' | 'anulada';

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

export interface AuthResponse {
  token: string;
  user: User;
}
