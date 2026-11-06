// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { mockUsers, Role } from '../services/mockService';
import logoLumina from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role>('retail_client');
  const [email, setEmail] = useState('juan@gmail.com');
  const [password, setPassword] = useState('********');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Búsqueda de usuario de prueba según el rol seleccionado (RF-02)[cite: 3]
    const foundUser = mockUsers.find(u => u.role === selectedRole) || mockUsers[1];
    
    localStorage.setItem('token', 'mock-jwt-token-lumina-2026');
    localStorage.setItem('user', JSON.stringify(foundUser));

    alert(`¡Sesión iniciada como: ${foundUser.name}!`);

    // Redirección inteligente por rol (RF-02)[cite: 3]
    if (selectedRole === 'admin') {
      navigate('/admin/books');
    } else if (selectedRole === 'sales_advisor') {
      navigate('/advisor/quotes');
    } else {
      navigate('/catalog');
    }
  };

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    const user = mockUsers.find(u => u.role === role);
    if (user) {
      setEmail(user.email);
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

        {/* Formulario de Autenticación */}
        <form onSubmit={handleLogin} className="space-y-4">
          

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
    <Link to="/register" className="text-editorial-primary font-bold hover:underline">
      Crear cuenta
    </Link>
  </p>
</div>

      </div>

    </div>
  );
}