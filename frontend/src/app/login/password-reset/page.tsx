// frontend/app/login/password-reset/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function PasswordResetPage() {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');

  const handlePasswordReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      await axios.post('http://localhost:8000/api/v1/auth/password/reset/', { email });
      setSuccess('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Password reset failed', error);
      alert('Failed to send password reset email. Please try again.');
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
          <h1 className="text-2xl font-bold text-center mb-6">Reset Password</h1>

          <form onSubmit={handlePasswordReset} className="space-y-4">
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
            <button
              type="submit"
              className="w-full rounded-xl bg-green-600 text-white py-2 font-semibold hover:bg-green-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </form>

          {success && <p className="mt-4 text-green-300 text-center">{success}</p>}

          <div className="mt-6 text-center">
            Remembered your password?{' '}
            <a href="/login" className="text-blue-300 hover:underline">
              Login here
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
