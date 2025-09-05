'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import JSZip from 'jszip'; // Make sure to install this library: npm install jszip

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

interface GroupedDownloadLink {
  id: string;
  title: string;
  author: string;
  cover_image: string;
  files: {
    audio?: { title: string; url: string; order?: number };
    transcription?: { title: string; url: string; order?: number };
  }[];
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<Audiobook[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [groupedDownloadLinks, setGroupedDownloadLinks] = useState<GroupedDownloadLink[]>([]);
  const [isZipping, setIsZipping] = useState<string | null>(null);

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

      const groupedLinks: GroupedDownloadLink[] = data.download_links.map((audiobookData: any) => {
        const files: GroupedDownloadLink['files'] = [];

        // Handle audio files
        const audioUrls = Array.isArray(audiobookData.audio_urls)
          ? audiobookData.audio_urls
          : audiobookData.audio_url
            ? [{ url: audiobookData.audio_url, order: 1 }]
            : [];
        audioUrls.forEach((audioFile: any) => {
          files.push({
            audio: {
              title: `${audiobookData.title}${audioFile.order ? ` (Audio ${audioFile.order})` : ' (Audio)'}`,
              url: audioFile.url,
              order: audioFile.order,
            },
          });
        });

        // Handle transcription files and pair with existing audio files
        const transcriptionUrls = Array.isArray(audiobookData.transcription_urls)
          ? audiobookData.transcription_urls
          : audiobookData.transcription_url
            ? [{ url: audiobookData.transcription_url, order: 1 }]
            : [];
        transcriptionUrls.forEach((transcriptionFile: any) => {
          const matchingAudioFile = files.find(f => f.audio && f.audio.order === transcriptionFile.order);
          if (matchingAudioFile) {
            matchingAudioFile.transcription = {
              title: `${audiobookData.title}${transcriptionFile.order ? ` (Transcript ${transcriptionFile.order})` : ' (Transcript)'}`,
              url: transcriptionFile.url,
              order: transcriptionFile.order,
            };
          }
        });

        return {
          id: audiobookData.id,
          title: audiobookData.title,
          cover_image: audiobookData.cover_image,
          author: cart.find(item => item.id === audiobookData.id)?.author || 'Unknown Author',
          files: files,
        };
      });

      setGroupedDownloadLinks(groupedLinks);
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

  const handleZipDownload = async (audiobook: GroupedDownloadLink) => {
    setIsZipping(audiobook.id);
    const zip = new JSZip();
    const folder = zip.folder(audiobook.title.replace(/[\s\W]+/g, '_'));

    const filePromises = audiobook.files.flatMap(fileGroup => {
      const promises = [];
      if (fileGroup.audio) {
        promises.push(
          fetch(fileGroup.audio.url)
            .then(res => res.blob())
            .then(blob => folder.file(`${fileGroup.audio.title.replace(/\s+/g, '_')}.mp3`, blob))
        );
      }
      if (fileGroup.transcription) {
        promises.push(
          fetch(fileGroup.transcription.url)
            .then(res => res.blob())
            .then(blob => folder.file(`${fileGroup.transcription.title.replace(/\s+/g, '_')}.txt`, blob))
        );
      }
      return promises;
    });

    try {
      await Promise.all(filePromises);
      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${audiobook.title.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Zipping failed:', error);
      alert('Failed to create and download the ZIP file.');
    } finally {
      setIsZipping(null);
    }
  };

  if (isOrderConfirmed) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center text-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
          <h2 className="text-3xl font-bold text-green-600 mb-4">✅ Order Confirmed!</h2>
          <p className="text-gray-700 mb-6">Thank you for your purchase. Your download links are ready.</p>
          <div className="space-y-6">
            {groupedDownloadLinks.map((audiobook) => (
              <div key={audiobook.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center space-x-4 mb-4">
                  <Image
                    src={audiobook.cover_image}
                    alt={`Cover of ${audiobook.title}`}
                    width={80}
                    height={80}
                    className="rounded-md shadow-sm"
                  />
                  <div className="text-left flex-1">
                    <h3 className="text-xl font-bold text-gray-800">{audiobook.title}</h3>
                    <p className="text-sm text-gray-500">by {audiobook.author}</p>
                  </div>
                </div>
                
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => handleZipDownload(audiobook)}
                    disabled={isZipping === audiobook.id}
                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
                      isZipping === audiobook.id ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isZipping === audiobook.id ? 'Zipping...' : 'Download All (.zip)'}
                  </button>
                </div>

                <div className="space-y-4 pl-4">
                  {audiobook.files.map((fileGroup, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1 mb-2 sm:mb-0 text-left">
                        <span className="text-lg font-medium text-gray-800">
                          {fileGroup.audio?.title || 'File'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        {fileGroup.audio && (
                          <button
                            onClick={() => downloadFile(fileGroup.audio.url, `${fileGroup.audio.title.replace(/\s+/g, '_')}.mp3`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Download Audio
                          </button>
                        )}
                        {fileGroup.transcription && (
                          <button
                            onClick={() => downloadFile(fileGroup.transcription.url, `${fileGroup.transcription.title.replace(/\s+/g, '_')}.txt`)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                          >
                            Download Transcript
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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