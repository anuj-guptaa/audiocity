"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Upload, BookOpen, User, Music, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
import axios from "axios"
import Navbar from '../../components/Navbar';

export default function UploadAudiobookPage() {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [price, setPrice] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!coverFile || !audioFile || !title || !author || !price) {
      setError("Please provide title, author, price, cover image, and audiobook file.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("author", author)
      formData.append("description", description)
      formData.append("tags", tags)
      formData.append("price", price)
      formData.append("cover_image", coverFile)
      formData.append("audio_file", audioFile)

      const token = localStorage.getItem("access_token")

      await axios.post("http://localhost:8000/api/v1/audiobooks/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      })

      setSuccess("Audiobook uploaded successfully! Transcription will be generated automatically.")
      setTitle("")
      setAuthor("")
      setDescription("")
      setTags("")
      setPrice("")
      setCoverFile(null)
      setAudioFile(null)

      const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
      fileInputs.forEach((input) => (input.value = ""))
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.detail || "Upload failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setIsLoggedIn(false)
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload New Audiobook</h2>
          <p className="text-gray-900">Add a new audiobook to the AudioCity store. Fill in all the details below.</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 border border-red-200 bg-red-50 rounded-md text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 mb-6 border border-green-200 bg-green-50 rounded-md text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <Upload className="w-5 h-5" /> Audiobook Details
          </h3>
          <p className="text-gray-900 mb-6">Provide the audiobook information and upload the necessary files.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Title */}
              <div className="space-y-2">
                <label htmlFor="title" className="flex items-center gap-2 font-medium text-gray-900">
                  <BookOpen className="w-4 h-4" /> Title *
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter audiobook title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full p-2 border rounded-md bg-white text-gray-900 placeholder-gray-600 resize-none"
                />
              </div>

              {/* Author */}
              <div className="space-y-2">
                <label htmlFor="author" className="flex items-center gap-2 font-medium text-gray-900">
                  <User className="w-4 h-4" /> Author *
                </label>
                <input
                  id="author"
                  type="text"
                  placeholder="Enter author name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                  className="w-full p-2 border rounded-md bg-white text-gray-900 placeholder-gray-600 resize-none"
                />
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label htmlFor="price" className="flex items-center gap-2 font-medium text-gray-900">
                  💲 Price *
                </label>
                <input
                  id="price"
                  type="number"
                  placeholder="Enter price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full p-2 border rounded-md bg-white text-gray-900 placeholder-gray-600 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Cover Image */}
              <div className="space-y-2">
                <label className="flex flex-col items-start">
                  <span className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md cursor-pointer hover:bg-blue-700">
                    <Upload className="w-4 h-4" /> Choose Cover Image *
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    required
                    className="hidden"
                  />
                </label>
                {coverFile && <p className="text-sm text-gray-700">Selected: {coverFile.name}</p>}
              </div>

              {/* Audio File */}
              <div className="space-y-2">
                <label className="flex flex-col items-start">
                  <span className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md cursor-pointer hover:bg-blue-700">
                    <Music className="w-4 h-4" /> Choose Audio File *
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    required
                    className="hidden"
                  />
                </label>
                {audioFile && <p className="text-sm text-gray-700">Selected: {audioFile.name}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Upload Audiobook
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
