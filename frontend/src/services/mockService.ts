// Antes "mockService": ahora consume la API real del backend vía services/api.ts.
// Se mantienen las mismas firmas e interfaces para no romper las páginas.
import api from './api';
import type { Book, CartLineInput, CustomOrderRequest, Order, OrderCalculation, Quote, Role } from './types';

export * from './types';

export const IVA_RATE = 0.12;

export const getVolumeDiscountRate = (totalUnits: number): number => {
  if (totalUnits >= 6 && totalUnits <= 20) return 0.05;
  if (totalUnits >= 21 && totalUnits <= 50) return 0.1;
  if (totalUnits > 50) return 0.15;
  return 0;
};

export const mockService = {
  async getBooks(filters?: { search?: string; genre?: string; format?: string }): Promise<Book[]> {
    const params: Record<string, string> = {};
    const search = filters?.search?.trim();
    if (search) params.search = search;
    const genre = filters?.genre?.trim();
    const format = filters?.format?.trim();
    if (genre && genre.toLowerCase() !== 'todos') params.genre = genre;
    if (format && format.toLowerCase() !== 'todos') params.format = format;
    const { data } = await api.get('/books', { params });
    return data.data as Book[];
  },

  async getBookById(id: number): Promise<Book | null> {
    const { data } = await api.get(`/books/${id}`);
    return (data.data as Book) ?? null;
  },

  async calculateOrder(items: CartLineInput[], _userRole?: Role): Promise<OrderCalculation> {
    const { data } = await api.post('/orders/calculate', { items });
    return data.data as OrderCalculation;
  },

  async createOrder(payload: {
    items: CartLineInput[];
    userRole?: Role;
    userId?: number;
    userName?: string;
  }): Promise<Order> {
    const { data } = await api.post('/orders', { items: payload.items });
    return data.data as Order;
  },

  async getOrders(): Promise<Order[]> {
    const { data } = await api.get('/orders');
    return data.data as Order[];
  },

  async addBook(newBook: Omit<Book, 'id'>): Promise<Book> {
    const { data } = await api.post('/books', newBook);
    return data.data as Book;
  },

  async updateBook(id: number, updates: Partial<Omit<Book, 'id'>>): Promise<Book | null> {
    const { data } = await api.put(`/books/${id}`, updates);
    return (data.data as Book) ?? null;
  },

  async deleteBook(id: number): Promise<boolean> {
    await api.delete(`/books/${id}`);
    return true;
  },

  async updateStock(id: number, stock: number): Promise<Book | null> {
    const { data } = await api.patch(`/books/${id}/stock`, { stock });
    return (data.data as Book) ?? null;
  },

  async getCustomOrders(status?: string): Promise<CustomOrderRequest[]> {
    const { data } = await api.get('/custom-orders', {
      params: status && status !== 'todas' ? { estado: status } : {},
    });
    return data.data as CustomOrderRequest[];
  },

  async createCustomOrder(
    payload: Omit<CustomOrderRequest, 'id' | 'status' | 'createdAt'>,
  ): Promise<CustomOrderRequest> {
    const { data } = await api.post('/custom-orders', payload);
    return data.data as CustomOrderRequest;
  },

  async updateCustomOrderStatus(id: number, status: string): Promise<CustomOrderRequest | null> {
    const { data } = await api.patch(`/custom-orders/${id}/status`, { status });
    return (data.data as CustomOrderRequest) ?? null;
  },

  async getQuotes(): Promise<Quote[]> {
    const { data } = await api.get('/quotes');
    return data.data as Quote[];
  },

  async createQuote(payload: Omit<Quote, 'id' | 'status' | 'createdAt'>): Promise<Quote> {
    const { data } = await api.post('/quotes', {
      requestId: payload.requestId,
      unitPrice: payload.unitPrice,
      validUntil: payload.validUntil,
      notes: payload.notes,
    });
    return data.data as Quote;
  },

  async updateQuoteStatus(id: number, status: string): Promise<Quote | null> {
    const { data } = await api.patch(`/quotes/${id}/status`, { status });
    return (data.data as Quote) ?? null;
  },
};
