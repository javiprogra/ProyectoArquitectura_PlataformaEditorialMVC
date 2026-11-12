import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isAuthenticatedClient } from '../utils/session';

export interface CartItem {
  bookId: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  addItem: (bookId: number, quantity?: number) => void;
  updateQuantity: (bookId: number, quantity: number) => void;
  removeItem: (bookId: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = 'lumina_cart';

const CartContext = createContext<CartContextValue | undefined>(undefined);

const loadCart = (): CartItem[] => {
  if (!isAuthenticatedClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is CartItem =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as CartItem).bookId === 'number' &&
          typeof (entry as CartItem).quantity === 'number',
      )
      .map((entry) => ({
        bookId: entry.bookId,
        quantity: Math.max(1, Math.floor(entry.quantity)),
      }));
  } catch {
    return [];
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((bookId: number, quantity = 1) => {
    if (!isAuthenticatedClient()) return;
    const safeQuantity = Math.max(1, Math.floor(quantity));
    setItems((previous) => {
      const existing = previous.find((item) => item.bookId === bookId);
      if (existing) {
        return previous.map((item) =>
          item.bookId === bookId
            ? { ...item, quantity: item.quantity + safeQuantity }
            : item,
        );
      }
      return [...previous, { bookId, quantity: safeQuantity }];
    });
  }, []);

  const updateQuantity = useCallback((bookId: number, quantity: number) => {
    const safeQuantity = Math.max(1, Math.floor(quantity));
    setItems((previous) =>
      previous.map((item) =>
        item.bookId === bookId ? { ...item, quantity: safeQuantity } : item,
      ),
    );
  }, []);

  const removeItem = useCallback((bookId: number) => {
    setItems((previous) => previous.filter((item) => item.bookId !== bookId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, totalItems, addItem, updateQuantity, removeItem, clearCart }),
    [items, totalItems, addItem, updateQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe utilizarse dentro de un CartProvider');
  }
  return context;
}
