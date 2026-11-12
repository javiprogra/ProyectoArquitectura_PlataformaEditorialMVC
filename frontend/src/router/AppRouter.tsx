// src/router/AppRouter.tsx
import React from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from '../pages/inicio';
import Catalog from '../pages/Catalog';
import Login from '../pages/login';
import Register from '../pages/Register';
import BookDetail from '../pages/BookDetail';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import CustomOrder from '../pages/CustomOrder';
import AdminPanel from '../pages/AdminPanel';
import AdvisorDashboard from '../pages/AdvisorDashboard';
import { canPurchase, canRequestQuotes } from '../utils/session';

const RequirePurchaseAccess: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();

  if (!canPurchase()) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?reason=purchase&redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
};

const RequireInstitutionalClient: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (!canRequestQuotes()) {
    return <Navigate to="/catalog?access=institutional" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal*/}
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route
          path="/cart"
          element={
            <RequirePurchaseAccess>
              <Cart />
            </RequirePurchaseAccess>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequirePurchaseAccess>
              <Checkout />
            </RequirePurchaseAccess>
          }
        />
        <Route
          path="/custom-order"
          element={
            <RequireInstitutionalClient>
              <CustomOrder />
            </RequireInstitutionalClient>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Paneles por rol*/}
        <Route path="/admin" element={<Navigate to="/admin/books" replace />} />
        <Route path="/admin/books" element={<AdminPanel />} />
        <Route path="/advisor" element={<Navigate to="/advisor/quotes" replace />} />
        <Route path="/advisor/quotes" element={<AdvisorDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
