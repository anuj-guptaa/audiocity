// frontend/app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post<{ access: string; refresh: string }>(
        'http://localhost:8000/api/v1/auth/login/',
        { email, password }
      );

      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      router.push('/');
    } catch (error) {
      console.error('Failed to log in', error);
      alert('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-gray-800 shadow-xl rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-center mb-6 text-yellow-400">
            Welcome Back to Audiobook Haven
          </h1>
          <p className="text-center text-gray-300 mb-6">
            Access your store and enjoy your favorite stories anytime.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-200">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@audiobook.com"
                required
                className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white p-2 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white p-2 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-yellow-400 text-gray-900 py-2 font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <p className="text-right text-gray-300 text-sm mt-1">
              Forgot your password?{' '}
              <a href="/login/password-reset/" className="text-yellow-300 hover:underline">
                Reset here
              </a>
            </p>
          </form>

          <div className="my-6 flex items-center justify-center">
            <span className="h-px w-1/4 bg-gray-600" />
            <span className="mx-3 text-sm text-gray-300">Or</span>
            <span className="h-px w-1/4 bg-gray-600" />
          </div>

          <GoogleLoginButton />
          <p className="text-center text-gray-300 mt-4">
            Don't have an account?{' '}
            <a href="/register" className="text-yellow-300 hover:underline">
              Sign up now
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
