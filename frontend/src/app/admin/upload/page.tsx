"use client"

import { useState, DragEvent } from "react"
import { useRouter } from "next/navigation"
import { Upload, BookOpen, User, Music, CheckCircle, AlertCircle, X } from "lucide-react"
import axios from "axios"
import Navbar from "../../components/Navbar"

interface AudioFileWithOrder {
  file: File
  order: number
}

export default function UploadAudiobookPage() {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [price, setPrice] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFileWithOrder[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return
    const newFiles: AudioFileWithOrder[] = Array.from(files).map((f, idx) => ({
      file: f,
      order: audioFiles.length + idx + 1,
    }))
    setAudioFiles((prev) => [...prev, ...newFiles])
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleFilesAdded(e.dataTransfer.files)
  }

  const handleRemoveFile = (index: number) => {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleOrderChange = (index: number, value: number) => {
    setAudioFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, order: value } : item))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!coverFile || audioFiles.length === 0 || !title || !author || !price) {
      setError("Please provide title, author, price, cover image, and at least one audiobook file.")
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

      audioFiles.forEach((item) => {
        formData.append("audio_files", item.file)
        formData.append("audio_orders", String(item.order)) // parallel list of orders
      })

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
      setAudioFiles([])
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.detail || "Upload failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Navbar />

      <main className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload New Audiobook</h2>
          <p className="text-gray-900">Add a new audiobook to the AudioCity store. Fill in all the details below.</p>
        </div>

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
                  className="w-full p-2 border rounded-md bg-white text-gray-900 placeholder-gray-600"
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
                  className="w-full p-2 border rounded-md bg-white text-gray-900 placeholder-gray-600"
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
                  className="w-full p-2 border rounded-md bg-white text-gray-900 placeholder-gray-600"
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
                    // className="hidden"
                  />
                </label>
                {coverFile && <p className="text-sm text-gray-700">Selected: {coverFile.name}</p>}
              </div>

              {/* Audio Files (Drag & Drop only) */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                  dragOver ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
              >
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => handleFilesAdded(e.target.files)}
                  className="hidden"
                  id="audio-files"
                />
                <label htmlFor="audio-files" className="flex flex-col items-center justify-center h-full cursor-pointer">
                  <Music className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-gray-700 font-medium">Drag & drop audio files here</p>
                  <p className="text-sm text-gray-500">or click to select multiple files</p>
                </label>
              </div>
            </div>

            {/* Scrollable file list (separate from box) */}
            {audioFiles.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <h4 className="font-medium text-gray-900 mb-2">Uploaded Files - <b>Ensure the ordering is correct</b></h4>
                <ul className="space-y-2">
                  {audioFiles.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 bg-white border rounded-md p-2 shadow-sm"
                    >
                      {/* Filename */}
                      <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{item.file.name}</span>

                      {/* Order + Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          value={item.order}
                          min={1}
                          onChange={(e) => handleOrderChange(idx, Number(e.target.value))}
                          className="w-14 text-center border rounded-full text-xs font-medium text-gray-700 bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-8">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center gap-2 shadow-md"
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
