// Requirements: 12.1, 12.2, 8.1, 8.2
// Tasks: 6.2.1 (camera/upload interface), 6.2.2 (Claude Vision), 6.2.3 (TTS read-aloud)
import { useState, useRef, useCallback } from 'react'
import { describeImage } from '@/services/claudeService'
import { ttsEngine } from '@/services/ttsEngine'

type ImageSource = { base64: string; mimeType: string; previewUrl: string } | null

export function ImageToSpeech() {
  const [imageSource, setImageSource] = useState<ImageSource>(null)
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setDescription('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      // dataUrl = "data:<mimeType>;base64,<data>"
      const [header, base64] = dataUrl.split(',')
      const mimeType = header.replace('data:', '').replace(';base64', '')
      setImageSource({ base64, mimeType, previewUrl: dataUrl })
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Camera capture ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsCameraActive(true)
    } catch {
      setCameraError('Camera access denied or unavailable. Please use the file upload option instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setIsCameraActive(false)
  }, [])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const [, base64] = dataUrl.split(',')

    setImageSource({ base64, mimeType: 'image/jpeg', previewUrl: dataUrl })
    setDescription('')
    setError('')
    stopCamera()
  }, [stopCamera])

  // ── Describe image via Claude Vision ────────────────────────────────────────
  const handleDescribe = useCallback(async () => {
    if (!imageSource) return
    setIsLoading(true)
    setError('')
    setDescription('')

    const result = await describeImage(imageSource.base64, imageSource.mimeType)

    if (result === 'Image description unavailable') {
      setError('Could not generate a description. Please check your connection or API configuration.')
    } else {
      setDescription(result)
    }
    setIsLoading(false)
  }, [imageSource])

  // ── Read description aloud ──────────────────────────────────────────────────
  const handleReadAloud = useCallback(() => {
    if (description) ttsEngine.speak(description)
  }, [description])

  const handleReset = useCallback(() => {
    setImageSource(null)
    setDescription('')
    setError('')
    stopCamera()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [stopCamera])

  return (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto">
      <h1 id="its-heading" className="text-xl font-semibold">Image to Speech</h1>
      <p className="text-sm text-gray-600">
        Upload or capture an image to generate an audio description using AI.
      </p>

      {/* ── Upload section ── */}
      <section aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-base font-medium mb-2">Select Image</h2>

        <div className="flex flex-col gap-3">
          {/* File upload */}
          <div>
            <label htmlFor="image-upload" className="block text-sm font-medium mb-1">
              Upload from device
            </label>
            <input
              id="image-upload"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              aria-label="Upload an image file"
              aria-describedby="upload-hint"
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p id="upload-hint" className="text-xs text-gray-500 mt-1">
              Accepts JPEG, PNG, GIF, WebP and other image formats.
            </p>
          </div>

          {/* Camera capture */}
          <div>
            <p className="text-sm font-medium mb-1">Or capture with camera</p>
            {cameraError && (
              <div role="alert" className="mb-2 rounded bg-yellow-50 border border-yellow-300 p-2 text-yellow-800 text-sm">
                {cameraError}
              </div>
            )}

            {!isCameraActive ? (
              <button
                onClick={startCamera}
                aria-label="Open camera to capture a photo"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              >
                📷 Open Camera
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <video
                  ref={videoRef}
                  aria-label="Camera preview"
                  className="w-full rounded-lg border border-gray-300 bg-black"
                  playsInline
                  muted
                />
                <div className="flex gap-2">
                  <button
                    onClick={capturePhoto}
                    aria-label="Capture photo from camera"
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    📸 Capture
                  </button>
                  <button
                    onClick={stopCamera}
                    aria-label="Cancel camera and close"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* ── Image preview ── */}
      {imageSource && (
        <section aria-labelledby="preview-heading">
          <h2 id="preview-heading" className="text-base font-medium mb-2">Image Preview</h2>
          <img
            src={imageSource.previewUrl}
            alt={description || 'Selected image — no description yet'}
            className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
            loading="lazy"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDescribe}
              disabled={isLoading}
              aria-label="Generate description for the selected image using AI"
              aria-busy={isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              {isLoading ? '⏳ Describing…' : '🔍 Describe Image'}
            </button>
            <button
              onClick={handleReset}
              aria-label="Remove selected image and start over"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              ✕ Clear
            </button>
          </div>
        </section>
      )}

      {/* ── Error ── */}
      {error && (
        <div role="alert" className="rounded bg-red-50 border border-red-300 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Description output ── */}
      {description && (
        <section aria-labelledby="description-heading">
          <h2 id="description-heading" className="text-base font-medium mb-2">Image Description</h2>
          <div
            role="region"
            aria-live="polite"
            aria-label="Generated image description"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-gray-800 leading-relaxed"
          >
            {description}
          </div>
          <button
            onClick={handleReadAloud}
            aria-label="Read image description aloud using text-to-speech"
            className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2 text-white text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px]"
          >
            🔊 Read Aloud
          </button>
        </section>
      )}
    </div>
  )
}
