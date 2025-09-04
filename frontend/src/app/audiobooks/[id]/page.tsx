'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Audiobook {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_image: string;
  tags: string;
}

export default function AudiobookPage() {
  const { id } = useParams();
  const router = useRouter();
  const [book, setBook] = useState<Audiobook | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

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
  }, [id]);

  if (!book) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <button onClick={() => router.back()} className="text-blue-500 hover:text-blue-700 mb-6">
        ← Back
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center text-center">
        <Image
          src={book.cover_image}
          width={250}
          height={250}
          alt={book.title}
          className="rounded-md mb-6"
        />
        <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
        <p className="text-xl text-gray-700 mb-4">by {book.author}</p>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {book.tags.split(',').map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-full"
            >
              {tag.trim()}
            </span>
          ))}
        </div>
        <p className="text-2xl font-bold text-gray-800 mb-4">$9.99</p>
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
        <p className="text-gray-700 leading-relaxed">{book.description}</p>
      </div>
    </div>
  );
}
