'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';

// Mock data for user roles
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
  file_url: string; // URL to the audiobook file
}

export default function HomePage() {
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [cart, setCart] = useState<Audiobook[]>([]);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(mockUser);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      router.replace('/login'); // redirect immediately
      return;
    }
   

    setIsLoggedIn(true);

    // Load cart from localStorage on initial render
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    const fetchAudiobooks = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/audiobooks/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsLoggedIn(false);
          router.replace('/login'); // redirect immediately
          return;
        }

        else if (!response.ok) {
          throw new Error(`Error fetching audiobooks: ${response.statusText}`);
        }

        const data = await response.json();
        setAudiobooks(data);
      } catch (error) {
        console.error('Failed to fetch audiobooks:', error);
      }
    };

    fetchAudiobooks();
    setIsCheckingAuth(false);
  }, [router]);

  const addToCart = (book: Audiobook) => {
    setCart((prevCart) => {
      if (prevCart.some((item) => item.id === book.id)) return prevCart;
      const newCart = [...prevCart, book];
      localStorage.setItem('cart', JSON.stringify(newCart)); // Save to localStorage
      return newCart;
    });
  };

  const removeFromCart = (bookId: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => item.id !== bookId);
      localStorage.setItem('cart', JSON.stringify(newCart)); // Save to localStorage
      return newCart;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('cart'); // Also clear the cart on logout
    setIsLoggedIn(false);
    router.replace('/login'); // redirect after logout
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this audiobook?')) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('You are not authorized.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/audiobooks/${bookId}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete audiobook: ${response.statusText}`);
      }

      // Remove from local state and cart after successful deletion
      setAudiobooks((prev) => prev.filter((book) => book.id !== bookId));
      removeFromCart(bookId); // Ensure it's removed from the cart as well
      alert('Audiobook deleted successfully!');
    } catch (error) {
      console.error(error);
      alert('Error deleting audiobook.');
    }
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

  if (isCheckingAuth) {
    return null; // or a spinner while checking auth
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Popular Audiobooks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {audiobooks.map((book) => (
            <div
              key={book.id}
              onClick={(e) => {
                // Prevent click if add to cart or delete buttons are clicked
                const target = e.target as HTMLElement;
                if (target.tagName === 'BUTTON') return;
                router.push(`/audiobooks/${book.id}`);
              }}
              className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center cursor-pointer hover:shadow-xl transition-shadow"
            >
              <Image
                src={book.cover_image}
                alt={`Cover of ${book.title}`}
                width={150}
                height={150}
                className="rounded-md mb-4"
              />
              <h3 className="text-xl font-semibold text-gray-900 line-clamp-2">{book.title}</h3>
              <p className="text-sm text-gray-600 mt-1">by {book.author}</p>
              <p className="text-lg font-bold text-gray-800 mt-2">${book.price}</p>
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
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => addToCart(book)}
                  disabled={cart.some((item) => item.id === book.id)}
                  className={`px-6 py-2 rounded-lg transition-colors ${cart.some((item) => item.id === book.id)
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {cart.some((item) => item.id === book.id) ? 'In Cart' : 'Add to Cart'}
                </button>

                {user.role === 'admin' && (
                  <button
                    onClick={() => handleDelete(book.id)}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Shopping Cart */}
      <aside className="fixed bottom-0 right-0 m-8 w-80 bg-white p-6 rounded-lg shadow-xl border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">🛒 Your Cart ({cart.length})</h3>
        {cart.length === 0 ? (
          <p className="text-gray-500">Your cart is empty.</p>
        ) : (
          <>
            <ul className="space-y-4 max-h-48 overflow-y-auto pr-2">
              {cart.map((item) => (
                <li key={item.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                    <p className="text-sm text-gray-600">${item.price}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 ml-4">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-lg font-bold text-gray-900">
                Total: ${cart.reduce((total, item) => total + parseFloat(item.price), 0).toFixed(2)}
              </p>
              <Link
                href="/checkout"
                className="mt-4 block w-full text-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}