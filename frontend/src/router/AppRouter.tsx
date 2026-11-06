// src/router/AppRouter.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/inicio'; // O './pages/inicio' según cómo hayas nombrado tu archivo
import Catalog from '@/pages/Catalog';
import Login from '@/pages/login';
import Register from '@/pages/Register';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal (Landing Page de LUMINA) */}
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
};