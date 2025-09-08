'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

// Mock data for user roles - not used anymore, but kept for reference, comes from Navbar
const mockUser = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'admin', // can be 'admin' or 'regular'
};

interface Audiobook {
  id: string;
  title: string;
  author: string;
  price: string;
  description: string;
  cover_image: string;
  tags: string;
}

export default function AudiobookPage() {
  const { id } = useParams();
  const router = useRouter();
  const [book, setBook] = useState<Audiobook | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(mockUser);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    setIsLoggedIn(true);
    setIsCheckingAuth(false);

    const fetchBook = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/audiobooks/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch audiobook');

        const data = await response.json();
        setBook(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchBook();
  }, [id, router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsLoggedIn(false);
    router.replace('/login');
  };

  const renderAuthButtons = () => {
    if (isLoggedIn) {
      return (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">Welcome, {user.name}!</span>
          <div className="flex items-center space-x-4 ml-auto">
            {/* {user.role === 'admin' && (
              <Link
                href="/admin"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                Admin Dashboard
              </Link>
            )} */}
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-red-500 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/login"
          className="text-sm font-semibold text-blue-500 hover:text-blue-700"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="text-sm font-semibold text-blue-500 hover:text-blue-700"
        >
          Sign Up
        </Link>
      </div>
    );
  };

  if (isCheckingAuth || !book) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Navbar />

      {/* Audiobook Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center text-center">
        <Image
          src={book.cover_image}
          width={250}
          height={250}
          alt={book.title}
          className="rounded-md mb-6"
        />
        <h1 className="text-4xl text-gray-700 font-bold mb-2">{book.title}</h1>
        <p className="text-xl text-gray-700 mb-4">by {book.author}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {book.tags && book.tags.trim() !== "" ? (
                  book.tags.split(',').map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-full"
                    >
                      {tag.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium text-gray-500">Generating tags...</span>
                )}
              </div>
        <p className="text-2xl font-bold text-gray-800 mb-4">${book.price}</p>
        <Link
          href="/checkout"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Buy Now
        </Link>
      </div>

      {/* Description Section */}
<div className="bg-white rounded-lg shadow-lg p-8 mt-8 max-w-3xl mx-auto">
  <h2 className="text-3xl font-bold mb-4 text-gray-800">Description</h2>
  <p className="text-gray-700 leading-relaxed">
    {book.description && book.description.trim() !== ""
      ? book.description
      : "Generating description..."}
  </p>
</div>
    </div>
  );
}
