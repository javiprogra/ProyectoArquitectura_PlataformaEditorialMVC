// src/pages/Register.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Role } from '../services/mockService';
import logoLumina from '../assets/logo.png';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('retail_client');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Conectar con el endpoint POST /api/auth/register del Backend
    // Aquí el backend debe procesar la contraseña de forma segura mediante hashing (Bcrypt/Argon2)[cite: 5]
    
    alert(`¡Cuenta creada con éxito para ${name} (${role})!`);
    navigate(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login');
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden py-12">
      
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

      {/* Tarjeta Blanca Flotante Centrada (Formulario de Registro) */}
      <div className="relative z-10 bg-white w-full max-w-md mx-4 p-8 md:p-10 rounded-xl shadow-2xl border border-gray-100 my-8">
        
        {/* Encabezado e Isologo */}
        <div className="flex flex-col items-center mb-6 text-center">
          <span className="font-serif italic text-gray-700 tracking-widest text-sm mb-1 uppercase">
            Únete a
          </span>
          <img 
            src={logoLumina} 
            alt="LUMINA Logo" 
            className="h-14 w-auto object-contain my-2" 
          />
          <p className="text-xs text-gray-400 mt-1">Registro de Nueva Cuenta</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleRegister} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo / Razón Social</label>
            <input 
              type="text" 
              placeholder="Ej. Juan Pérez / Universidad Mesoamericana"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="correo@ejemplo.com"
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
              placeholder="••••••••"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="text-[10px] text-gray-400 mt-1 block">Será procesada con hashing seguro (Bcrypt/Argon2)[cite: 5].</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-editorial-primary uppercase mb-1">
              Tipo de Cuenta / Rol:
            </label>
            <select 
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-editorial-primary focus:outline-none font-medium"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="retail_client">Cliente Minorista (Compras individuales)</option>
              <option value="institutional_client">Cliente Institucional / Mayorista (Descuentos por volumen)</option>
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-editorial-primary text-white py-3 rounded-lg font-bold hover:bg-editorial-secondary transition shadow-lg mt-2"
          >
            Registrarse
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
          <p className="text-xs text-gray-500">
            ¿Ya tienes una cuenta?{' '}
            <Link
              to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
              className="text-editorial-secondary font-bold hover:underline"
            >
              Inicia sesión aquí
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
}