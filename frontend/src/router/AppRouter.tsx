// src/router/AppRouter.tsx
import React from 'react';
import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import type { Role } from '../services/types';
import { getCurrentUser } from '../utils/session';

function ProtectedRoute({ element, roles }: { element: ReactElement; roles: Role[] }) {
  const user = getCurrentUser();
  return user && roles.includes(user.role) ? element : <Navigate to="/login" replace />;
}

const CLIENT_ROLES: Role[] = ['retail_client', 'institutional_client'];

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal (Landing Page de LUMINA) */}
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/cart" element={<ProtectedRoute element={<Cart />} roles={CLIENT_ROLES} />} />
        <Route path="/checkout" element={<ProtectedRoute element={<Checkout />} roles={CLIENT_ROLES} />} />
        <Route path="/custom-order" element={<ProtectedRoute element={<CustomOrder />} roles={CLIENT_ROLES} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Paneles por rol (RF-05) */}
        <Route path="/admin" element={<Navigate to="/admin/books" replace />} />
        <Route path="/admin/books" element={<ProtectedRoute element={<AdminPanel />} roles={['admin']} />} />
        <Route path="/advisor" element={<Navigate to="/advisor/quotes" replace />} />
        <Route path="/advisor/quotes" element={<ProtectedRoute element={<AdvisorDashboard />} roles={['sales_advisor', 'admin']} />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
