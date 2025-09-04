'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Mock data for user roles
const mockUser = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'admin', // can be 'admin' or 'regular'
};

export default function Navbar() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [user, setUser] = useState(mockUser);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setIsLoggedIn(false);
        } else {
            setIsLoggedIn(true);
        }
        setIsCheckingAuth(false);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsLoggedIn(false);
        router.replace('/login');
    };

    if (isCheckingAuth) return null; // or a spinner

    return (
        <header className="flex justify-between items-center mb-10 pb-4 border-b border-gray-300">
            <div className="flex items-center space-x-4">
                <Link href="/" className="text-lg text-gray-600 hover:text-gray-900 font-medium">
                    <h1 className="text-4xl font-extrabold text-gray-800">📚 AudioCity</h1>
                </Link>
                <nav>
                    <ul className="flex space-x-6">
                        {isLoggedIn && user.role === 'admin' && (
                            <li>
                                <Link
                                    href="/admin/upload"
                                    className="text-lg text-gray-600 hover:text-gray-900 font-medium"
                                >
                                    <u>Upload Audiobook</u>
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>
            </div>

            {isLoggedIn ? (
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">Welcome, {user.name}!</span>
                    <button
                        onClick={handleLogout}
                        className="text-sm font-semibold text-red-500 hover:text-red-700"
                    >
                        Logout
                    </button>
                </div>
            ) : (
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
            )}
        </header>
    );
}
