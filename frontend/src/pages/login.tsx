// src/pages/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { AuthResponse } from '../services/types';
import logoLumina from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('juan@gmail.com');
  const [password, setPassword] = useState('juan123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const auth = data.data as AuthResponse;
      localStorage.setItem('token', auth.token);
      localStorage.setItem('user', JSON.stringify(auth.user));

      if (auth.user.role === 'admin') {
        navigate('/admin/books');
      } else if (auth.user.role === 'sales_advisor') {
        navigate('/advisor/quotes');
      } else {
        navigate('/catalog');
      }
    } catch {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
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

      <div className="relative z-10 bg-white w-full max-w-md mx-4 p-8 md:p-10 rounded-xl shadow-2xl border border-gray-100 my-8">
        <div className="flex flex-col items-center mb-6 text-center">
          <span className="font-serif italic text-gray-700 tracking-widest text-sm mb-1 uppercase">
            Bienvenidos a
          </span>
          <img src={logoLumina} alt="LUMINA Logo" className="h-20 w-auto object-contain my-2" />
        </div>

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
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
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
