import { useState, useRef, useCallback, useId } from 'react'
import { aacPictograms } from '@/data/aacPictograms'
import { ttsEngine } from '@/services/ttsEngine'
import { useAccessibility } from '@/context/AccessibilityContext'
import type { Pictogram, AACBoardConfig, PictogramCategory } from '@/types'

const STORAGE_KEY = 'aac_board_config'

const LAYOUT_OPTIONS: AACBoardConfig['layout'][] = ['grid-3', 'grid-4', 'grid-5']
const LAYOUT_LABELS: Record<AACBoardConfig['layout'], string> = {
  'grid-3': '3 columns',
  'grid-4': '4 columns',
  'grid-5': '5 columns',
}
const LAYOUT_COLS: Record<AACBoardConfig['layout'], string> = {
  'grid-3': 'grid-cols-3',
  'grid-4': 'grid-cols-4',
  'grid-5': 'grid-cols-5',
}

function loadConfig(userId: string): AACBoardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AACBoardConfig
  } catch {
    // ignore
  }
  return { userId, pictograms: aacPictograms.slice(0, 12), layout: 'grid-4', ttsOnTap: true }
}

export default function AACBoardBuilderPage() {
  const { preferences } = useAccessibility()
  const userId = 'local-user'
  const [config, setConfig] = useState<AACBoardConfig>(() => loadConfig(userId))
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'copied'>('idle')

  // Custom pictogram form
  const [customLabel, setCustomLabel] = useState('')
  const [customPhrase, setCustomPhrase] = useState('')
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [formError, setFormError] = useState('')

  const formId = useId()
  const dragItem = useRef<number | null>(null)

  // ── Drag-and-drop handlers ────────────────────────────────────────────────

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index
    setDragIndex(index)
  }, [])

  const handleDragEnter = useCallback((index: number) => {
    setDragOverIndex(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragItem.current !== null && dragOverIndex !== null && dragItem.current !== dragOverIndex) {
      setConfig((prev) => {
        const updated = [...prev.pictograms]
        const [moved] = updated.splice(dragItem.current!, 1)
        updated.splice(dragOverIndex, 0, moved)
        return { ...prev, pictograms: updated }
      })
    }
    dragItem.current = null
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragOverIndex])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // ── Keyboard reorder ──────────────────────────────────────────────────────

  const moveItem = useCallback((from: number, to: number) => {
    if (to < 0 || to >= config.pictograms.length) return
    setConfig((prev) => {
      const updated = [...prev.pictograms]
      const [moved] = updated.splice(from, 1)
      updated.splice(to, 0, moved)
      return { ...prev, pictograms: updated }
    })
  }, [config.pictograms.length])

  // ── Remove pictogram ──────────────────────────────────────────────────────

  const removePictogram = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, pictograms: prev.pictograms.filter((p) => p.id !== id) }))
  }, [])

  // ── Tap preview ───────────────────────────────────────────────────────────

  const handleTap = useCallback((p: Pictogram) => {
    if (config.ttsOnTap && preferences.ttsEnabled) {
      ttsEngine.speak(p.phrase)
    }
  }, [config.ttsOnTap, preferences.ttsEnabled])

  // ── Custom pictogram upload ───────────────────────────────────────────────

  const handleAddCustom = useCallback(() => {
    setFormError('')
    if (!customLabel.trim()) { setFormError('Label is required.'); return }
    if (!customPhrase.trim()) { setFormError('Phrase is required.'); return }
    if (customLabel.trim().length > 100) { setFormError('Label must be 100 characters or fewer.'); return }

    const newPictogram: Pictogram = {
      id: `custom-${Date.now()}`,
      label: customLabel.trim(),
      phrase: customPhrase.trim(),
      category: 'greetings' as PictogramCategory,
      svgPath: customImageUrl.trim() || '🖼️',
      ariaLabel: customLabel.trim(),
      isCustom: true,
    }
    setConfig((prev) => ({ ...prev, pictograms: [...prev.pictograms, newPictogram] }))
    setCustomLabel('')
    setCustomPhrase('')
    setCustomImageUrl('')
  }, [customLabel, customPhrase, customImageUrl])

  // ── Save board ────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [config])

  // ── Share board ───────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    const json = JSON.stringify(config, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      setSaveStatus('copied')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      // fallback: create a temporary textarea
      const ta = document.createElement('textarea')
      ta.value = json
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setSaveStatus('copied')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }, [config])

  const colClass = LAYOUT_COLS[config.layout]

  return (
    <main id="main-content" className="flex flex-col gap-6 p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">AAC Board Builder</h1>

      {/* ── Toolbar ── */}
      <section aria-label="Board settings" className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        {/* Layout selector */}
        <fieldset className="flex items-center gap-2">
          <legend className="text-sm font-medium mr-2">Layout:</legend>
          {LAYOUT_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="layout"
                value={opt}
                checked={config.layout === opt}
                onChange={() => setConfig((prev) => ({ ...prev, layout: opt }))}
                aria-label={`Layout ${LAYOUT_LABELS[opt]}`}
                className="accent-blue-600"
              />
              <span className="text-sm">{LAYOUT_LABELS[opt]}</span>
            </label>
          ))}
        </fieldset>

        {/* TTS on tap toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.ttsOnTap}
            onChange={(e) => setConfig((prev) => ({ ...prev, ttsOnTap: e.target.checked }))}
            aria-label="Speak phrase on tap"
            className="accent-blue-600 w-4 h-4"
          />
          <span className="text-sm">Speak on tap</span>
        </label>

        {/* Save / Share */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleSave}
            aria-label="Save board configuration to local storage"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {saveStatus === 'saved' ? '✓ Saved' : 'Save Board'}
          </button>
          <button
            onClick={handleShare}
            aria-label="Copy board configuration JSON to clipboard"
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {saveStatus === 'copied' ? '✓ Copied' : 'Share Board'}
          </button>
        </div>
      </section>

      {/* ── Custom pictogram upload form ── */}
      <section aria-labelledby={`${formId}-heading`} className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 id={`${formId}-heading`} className="text-lg font-semibold mb-3">Add Custom Pictogram</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label htmlFor={`${formId}-label`} className="text-sm font-medium">Label <span aria-hidden="true">*</span></label>
            <input
              id={`${formId}-label`}
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              maxLength={100}
              placeholder="e.g. Homework"
              aria-required="true"
              aria-describedby={formError ? `${formId}-error` : undefined}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label htmlFor={`${formId}-phrase`} className="text-sm font-medium">Phrase <span aria-hidden="true">*</span></label>
            <input
              id={`${formId}-phrase`}
              type="text"
              value={customPhrase}
              onChange={(e) => setCustomPhrase(e.target.value)}
              placeholder="e.g. I need to do my homework"
              aria-required="true"
              aria-describedby={formError ? `${formId}-error` : undefined}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label htmlFor={`${formId}-image`} className="text-sm font-medium">Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              id={`${formId}-image`}
              type="url"
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              placeholder="https://example.com/icon.png"
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddCustom}
              aria-label="Add custom pictogram to board"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Add
            </button>
          </div>
        </div>
        {formError && (
          <p id={`${formId}-error`} role="alert" className="mt-2 text-sm text-red-600">
            {formError}
          </p>
        )}
      </section>

      {/* ── Board preview with drag-and-drop ── */}
      <section aria-label="Board preview — drag pictograms to reorder">
        <h2 className="text-lg font-semibold mb-3">
          Board Preview
          <span className="ml-2 text-sm font-normal text-gray-500">({config.pictograms.length} pictograms)</span>
        </h2>
        <div
          className={`grid ${colClass} gap-3`}
          aria-dropeffect="move"
        >
          {config.pictograms.map((p, index) => (
            <PictogramCard
              key={p.id}
              pictogram={p}
              index={index}
              total={config.pictograms.length}
              isDragging={dragIndex === index}
              isDragOver={dragOverIndex === index}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onTap={handleTap}
              onRemove={removePictogram}
              onMove={moveItem}
            />
          ))}
          {config.pictograms.length === 0 && (
            <p className="col-span-full text-center text-gray-400 py-12">
              No pictograms on the board. Add some above.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

// ── PictogramCard sub-component ───────────────────────────────────────────────

interface PictogramCardProps {
  pictogram: Pictogram
  index: number
  total: number
  isDragging: boolean
  isDragOver: boolean
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onTap: (p: Pictogram) => void
  onRemove: (id: string) => void
  onMove: (from: number, to: number) => void
}

function PictogramCard({
  pictogram, index, total,
  isDragging, isDragOver,
  onDragStart, onDragEnter, onDragEnd, onDragOver,
  onTap, onRemove, onMove,
}: PictogramCardProps) {
  const isImageUrl = pictogram.svgPath.startsWith('http') || pictogram.svgPath.startsWith('/')

  return (
    <div
      draggable
      aria-grabbed={isDragging}
      aria-label={`${pictogram.ariaLabel}, position ${index + 1} of ${total}. Drag to reorder.`}
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      className={`relative flex flex-col items-center gap-1 rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all select-none
        ${isDragging ? 'opacity-40 scale-95 border-blue-400 bg-blue-50' : ''}
        ${isDragOver && !isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-200 bg-white'}
      `}
    >
      {/* Drag handle */}
      <span
        aria-hidden="true"
        className="absolute top-1 left-1 text-gray-300 text-xs cursor-grab"
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Pictogram image / emoji */}
      <button
        onClick={() => onTap(pictogram)}
        aria-label={`Tap to preview: ${pictogram.ariaLabel}`}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      >
        {isImageUrl ? (
          <img
            src={pictogram.svgPath}
            alt={pictogram.ariaLabel}
            className="w-12 h-12 object-contain"
            loading="lazy"
          />
        ) : (
          <span aria-hidden="true" className="text-4xl leading-none block text-center" style={{ minWidth: 48, minHeight: 48 }}>
            {pictogram.svgPath}
          </span>
        )}
      </button>

      <span className="text-xs text-center text-gray-700 leading-tight font-medium">{pictogram.label}</span>
      {pictogram.isCustom && (
        <span className="text-xs text-blue-500 font-medium">custom</span>
      )}

      {/* Keyboard reorder controls */}
      <div className="flex gap-1 mt-1" role="group" aria-label={`Reorder ${pictogram.label}`}>
        <button
          onClick={() => onMove(index, index - 1)}
          disabled={index === 0}
          aria-label={`Move ${pictogram.label} left`}
          className="rounded px-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          ←
        </button>
        <button
          onClick={() => onMove(index, index + 1)}
          disabled={index === total - 1}
          aria-label={`Move ${pictogram.label} right`}
          className="rounded px-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          →
        </button>
        <button
          onClick={() => onRemove(pictogram.id)}
          aria-label={`Remove ${pictogram.label} from board`}
          className="rounded px-1 text-xs text-red-400 hover:bg-red-50 focus:outline-none focus:ring-1 focus:ring-red-400"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
