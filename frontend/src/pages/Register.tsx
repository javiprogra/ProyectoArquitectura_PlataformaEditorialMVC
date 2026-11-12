// src/pages/Register.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import logoLumina from '../assets/logo.png';

export default function Register() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'retail_client' | 'institutional_client'>('retail_client');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/register', {
        firstName,
        lastName,
        phone,
        address,
        email,
        password,
        role,
      });
      navigate('/login');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message ?? 'Error al registrar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden py-12">
      <div className="absolute inset-0 flex w-full h-full">
        <div className="w-1/2 bg-editorial-primary h-full"></div>
        <div className="w-1/2 bg-editorial-accent h-full"></div>
      </div>

      <Link
        to="/"
        className="absolute top-6 left-6 z-20 text-white hover:text-editorial-accent font-semibold text-sm flex items-center gap-2 transition"
      >
        &larr; Volver al inicio
      </Link>

      <div className="relative z-10 bg-white w-full max-w-lg mx-4 p-8 md:p-10 rounded-xl shadow-2xl border border-gray-100 my-8">
        <div className="flex flex-col items-center mb-6 text-center">
          <span className="font-serif italic text-gray-700 tracking-widest text-sm mb-1 uppercase">
            Únete a
          </span>
          <img src={logoLumina} alt="LUMINA Logo" className="h-14 w-auto object-contain my-2" />
          <p className="text-xs text-gray-400 mt-1">Registro de Nueva Cuenta</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                placeholder="Ej. Juan"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Apellido</label>
              <input
                type="text"
                placeholder="Ej. Pérez"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              placeholder="Ej. 5555-5555"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              placeholder="Ej. Zona 1, Ciudad de Guatemala"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-editorial-primary focus:outline-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
              minLength={8}
              required
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Será procesada con hashing seguro (bcrypt).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-editorial-primary uppercase mb-1">
              Tipo de Cuenta / Rol:
            </label>
            <select
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-editorial-primary focus:outline-none font-medium"
              value={role}
              onChange={(e) => setRole(e.target.value as 'retail_client' | 'institutional_client')}
            >
              <option value="retail_client">Cliente Minorista (Compras individuales)</option>
              <option value="institutional_client">
                Cliente Institucional / Mayorista (Descuentos por volumen)
              </option>
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-editorial-primary text-white py-3 rounded-lg font-bold hover:bg-editorial-secondary transition shadow-lg mt-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
          <p className="text-xs text-gray-500">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-editorial-primary font-bold hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
