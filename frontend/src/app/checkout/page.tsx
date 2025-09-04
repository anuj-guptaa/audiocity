'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../components/Navbar';

interface DownloadLink {
  id: string;
  title: string;
  url: string;
  type: 'audio' | 'transcription';
  cover_image: string;
  order?: number;
}

interface Audiobook {
  id: string;
  title: string;
  author: string;
  price: string;
  cover_image: string;
  tags: string;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<Audiobook[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cartItems: Audiobook[] = JSON.parse(savedCart);
      setCart(cartItems);
      const cartTotal = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
      setTotal(cartTotal);
    }
  }, []);

  const handleCheckout = async () => {
    setIsProcessing(true);
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('You are not logged in.');
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/v1/audiobooks/checkout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: cart.map(item => item.id) }),
      });

      if (!response.ok) throw new Error(`Checkout failed: ${response.statusText}`);
      const data = await response.json();

      // Flatten download links per audiobook
      const generatedLinks: DownloadLink[] = [];
      data.download_links.forEach((a: any) => {
        // Multiple audio files
        if (Array.isArray(a.audio_urls)) {
          a.audio_urls.forEach((file: any, idx: number) => {
            generatedLinks.push({
              id: a.id,
              title: `${a.title} (Audio ${file.order || idx + 1})`,
              url: file.url,
              type: 'audio',
              cover_image: a.cover_image,
              order: file.order || idx + 1,
            });
          });
        } else {
          generatedLinks.push({
            id: a.id,
            title: `${a.title} (Audio)`,
            url: a.audio_url,
            type: 'audio',
            cover_image: a.cover_image,
          });
        }

        if (Array.isArray(a.transcription_urls)) {
          a.transcription_urls.forEach((file: any) => {
            generatedLinks.push({
              id: a.id,
              title: `${a.title} (Transcript ${file.order || ''})`,
              url: file.url,
              type: 'transcription',
              cover_image: a.cover_image,
              order: file.order,
            });
          });
        } else if (a.transcription_url) {
          generatedLinks.push({
            id: a.id,
            title: `${a.title} (Transcript)`,
            url: a.transcription_url,
            type: 'transcription',
            cover_image: a.cover_image,
          });
        }
      });

      setDownloadLinks(generatedLinks);
      setIsOrderConfirmed(true);
      localStorage.removeItem('cart');
      setCart([]);
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred during checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file.');
    }
  };

  if (isOrderConfirmed) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
          <h2 className="text-3xl font-bold text-green-600 mb-4">✅ Order Confirmed!</h2>
          <p className="text-gray-700 mb-6">Thank you for your purchase. Your download links are ready.</p>
          <div className="space-y-4">
            {downloadLinks.map((item) => (
              <div key={`${item.id}-${item.type}-${item.order}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Image
                    src={item.cover_image}
                    alt={`Cover of ${item.title}`}
                    width={50}
                    height={50}
                    className="rounded-md shadow-sm"
                  />
                  <span className="text-lg font-medium text-gray-800">{item.title}</span>
                </div>
                <button
                  onClick={() => downloadFile(item.url, `${item.title.replace(/\s+/g, '_')}.mp3`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
          <Link href="/" className="mt-8 block text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Navbar />
      <main className="container mx-auto mt-10">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Checkout</h2>
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-2xl">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Your Items</h3>
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p className="text-xl">Your cart is empty.</p>
              <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
                Start shopping
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-6">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-center space-x-6 border-b pb-4 last:border-b-0 last:pb-0">
                    <Image
                      src={item.cover_image}
                      alt={`Cover of ${item.title}`}
                      width={80}
                      height={80}
                      className="rounded-lg shadow-md"
                    />
                    <div className="flex-1">
                      <h4 className="text-xl font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600">by {item.author}</p>
                    </div>
                    <span className="text-xl font-bold text-gray-800">${item.price}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-green-600">${total.toFixed(2)}</span>
              </div>
              <div className="mt-10">
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className={`w-full px-6 py-4 text-xl font-semibold rounded-lg transition-colors ${
                    isProcessing ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Confirm and Pay'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
