// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { mockUsers, Role } from '../services/mockService';
import logoLumina from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const reason = searchParams.get('reason');
  const [selectedRole, setSelectedRole] = useState<Role>('retail_client');
  const [email, setEmail] = useState('juan@gmail.com');
  const [password, setPassword] = useState('********');

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    const user = mockUsers.find((candidate) => candidate.role === role);
    if (user) {
      setEmail(user.email);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Búsqueda de usuario de prueba según el rol seleccionado (RF-02)[cite: 3]
    const foundUser = mockUsers.find(u => u.role === selectedRole) || mockUsers[1];
    
    localStorage.setItem('token', 'mock-jwt-token-lumina-2026');
    localStorage.setItem('user', JSON.stringify(foundUser));

    alert(`¡Sesión iniciada como: ${foundUser.name}!`);

    // Redirección inteligente por rol (RF-02)[cite: 3]
    if (redirect && foundUser.role !== 'visitor') {
      navigate(redirect);
    } else if (selectedRole === 'admin') {
      navigate('/admin/books');
    } else if (selectedRole === 'sales_advisor') {
      navigate('/advisor/quotes');
    } else {
      navigate('/catalog');
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
      
      {/* Fondo Dividido: Mitad Verde Editorial / Mitad Beige Acentuado */}
      <div className="absolute inset-0 flex w-full h-full">
        <div className="w-1/2 bg-editorial-primary h-full"></div>
        <div className="w-1/2 bg-editorial-accent h-full"></div>
      </div>

      {/* Botón flotante para regresar al inicio */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 z-20 text-white hover:text-editorial-accent font-semibold text-sm flex items-center gap-2 transition"
      >
        &larr; Volver al inicio
      </Link>

      {/* Tarjeta Blanca Flotante Centrada (Contenedor del Formulario) */}
      <div className="relative z-10 bg-white w-full max-w-md mx-4 p-8 md:p-10 rounded-xl shadow-2xl border border-gray-100 my-8">
        
        {/* Encabezado e Isologo con "BIENVENIDOS A" */}
        <div className="flex flex-col items-center mb-6 text-center">
          <span className="font-serif italic text-gray-700 tracking-widest text-sm mb-1 uppercase">
            Bienvenidos a
          </span>
          <img 
            src={logoLumina} 
            alt="LUMINA Logo" 
            className="h-20 w-auto object-contain my-2" 
          />
        </div>

        {reason === 'purchase' && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Debes iniciar sesión o crear una cuenta válida para comprar, agregar productos al
            carrito o acceder al checkout.{' '}
            <Link
              to={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
              className="font-bold underline"
            >
              Crear cuenta
            </Link>
          </div>
        )}

        {/* Formulario de Autenticación */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-editorial-primary uppercase mb-1">
              Rol de acceso (simulado)
            </label>
            <select
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value as Role)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-editorial-primary focus:outline-none font-medium"
            >
              <option value="visitor">Visitante</option>
              <option value="retail_client">Cliente Minorista</option>
              <option value="institutional_client">Cliente Institucional</option>
              <option value="sales_advisor">Asesor de Ventas</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-editorial-primary text-white py-3 rounded-lg font-bold hover:bg-editorial-secondary transition shadow-lg mt-2"
          >
            Iniciar Sesión
          </button>
        </form>
<div className="mt-6 border-t border-gray-100 pt-4 text-center">
  <p className="text-xs text-gray-500">
    ¿No tienes una cuenta?{' '}
    <Link
      to={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
      className="text-editorial-primary font-bold hover:underline"
    >
      Crear cuenta
    </Link>
  </p>
</div>

      </div>

    </div>
  );
}