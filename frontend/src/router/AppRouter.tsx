// src/router/AppRouter.tsx
import React from 'react';
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

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal (Landing Page de LUMINA) */}
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/custom-order" element={<CustomOrder />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Paneles por rol (RF-05) */}
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
