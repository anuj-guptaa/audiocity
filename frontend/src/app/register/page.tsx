// frontend/app/register/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function RegisterPage() {
  const [email, setEmail] = useState<string>('');
  const [password1, setPassword] = useState<string>('');
  const [password2, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password1 !== password2) {
      alert('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        'http://localhost:8000/api/v1/auth/registration/',
        { email, password1, password2, username: email } // Using email as username
      );

      alert('Registration successful! Please login.');
      router.push('/login');
    } catch (error) {
      console.error('Failed to register', error);
      alert('Registration failed. Try again.');
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
        <div className="bg-gray-700 shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Password</label>
              <input
                type="password"
                value={password1}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-green-600 text-white py-2 font-semibold hover:bg-green-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="my-6 flex items-center justify-center">
            <span className="h-px w-1/4 bg-gray-200" />
            <span className="mx-3 text-sm text-gray-100">Or</span>
            <span className="h-px w-1/4 bg-gray-200" />
          </div>

          <GoogleLoginButton />
                    <br></br>
          Already have an account?{' '}
          <a href="/login" className="text-blue-300 hover:underline">
            Sign in now
          </a>
        </div>
      </motion.div>
    </div>
  );
}
