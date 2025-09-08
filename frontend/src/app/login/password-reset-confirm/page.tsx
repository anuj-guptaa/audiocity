'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function PasswordResetConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();
  const uid = params.get('uid');
  const token = params.get('token');
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !token) return alert('Invalid reset link.');

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/password/reset/confirm/`, {
        uid,
        token,
        new_password1: password,
        new_password2: password,
      });
      setSuccess('Password reset successful! You can now login.');
    } catch (error: any) {
      console.error(error.response?.data || error);
      alert('Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-md bg-gray-700 shadow-xl rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Set New Password</h1>
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 text-white py-2 font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        {success && <p className="mt-4 text-green-300 text-center">{success}</p>}
      </div>
    </div>
  );
}
