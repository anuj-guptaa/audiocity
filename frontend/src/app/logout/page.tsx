// frontend/app/logout/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Remove tokens from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Optional: redirect to login page after logout
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold mb-4 text-gray-700">Logging out...</h1>
        <p className="text-gray-500">You are being redirected to the login page.</p>
      </motion.div>
    </div>
  );
}
