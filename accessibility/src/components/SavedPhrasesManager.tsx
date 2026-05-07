// Requirements: 6.1, 6.2, 6.3, 6.4
import { useState, useEffect, useRef } from 'react'
import type { SavedPhrase } from '@/types'
import {
  loadPhrases,
  savePhrasesToIDB,
  savePhraseToFirestore,
  deletePhraseFromFirestore,
  updatePhraseInFirestore,
  syncAllPhrasesToFirestore,
} from '@/services/savedPhrasesService'
import { getCurrentUser } from '@/services/authService'

const MAX_PHRASES = 100
const MAX_CHARS = 500

/** Synchronous initial load from localStorage (legacy cache key) for fast startup */
function loadPhrasesSync(): SavedPhrase[] {
  try {
    const raw = localStorage.getItem('saved_phrases_cache')
    if (raw) return JSON.parse(raw) as SavedPhrase[]
  } catch { /* ignore */ }
  return []
}

interface SavedPhrasesManagerProps {
  onInsert?: (text: string) => void
}

export function SavedPhrasesManager({ onInsert }: SavedPhrasesManagerProps) {
  const [phrases, setPhrases] = useState<SavedPhrase[]>(loadPhrasesSync)
  const [newText, setNewText] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const userId = useRef<string | null>(getCurrentUser()?.uid ?? null)

  // Load: IndexedDB first, then sync from Firestore
  useEffect(() => {
    let cancelled = false
    loadPhrases(userId.current).then(({ cached, synced }) => {
      if (!cancelled) setPhrases(cached)
      synced.then((remote) => {
        if (!cancelled) setPhrases(remote)
      })
    })
    return () => { cancelled = true }
  }, [])

  // Persist to IndexedDB (and localStorage for backward compat) on every change
  useEffect(() => {
    savePhrasesToIDB(phrases)
    try { localStorage.setItem('saved_phrases_cache', JSON.stringify(phrases)) } catch { /* ignore */ }
  }, [phrases])

  const handleAdd = () => {
    setAddError('')
    if (!newText.trim()) {
      setAddError('Phrase text is required.')
      return
    }
    if (newText.length > MAX_CHARS) {
      setAddError(`Phrase must be ${MAX_CHARS} characters or fewer.`)
      return
    }
    if (phrases.length >= MAX_PHRASES) {
      setAddError(`You can save up to ${MAX_PHRASES} phrases. Please delete one first.`)
      return
    }
    const phrase: SavedPhrase = {
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: newText.trim(),
      label: newLabel.trim() || newText.trim().slice(0, 40),
      order: phrases.length,
      createdAt: Date.now(),
    }
    setPhrases((prev) => {
      const next = [...prev, phrase]
      if (userId.current) savePhraseToFirestore(userId.current, phrase)
      return next
    })
    setNewText('')
    setNewLabel('')
  }

  const handleDelete = (id: string) => {
    setPhrases((prev) => {
      const next = prev.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i }))
      if (userId.current) {
        deletePhraseFromFirestore(userId.current, id)
        syncAllPhrasesToFirestore(userId.current, next)
      }
      return next
    })
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    setPhrases((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      const reordered = next.map((p, i) => ({ ...p, order: i }))
      if (userId.current) syncAllPhrasesToFirestore(userId.current, reordered)
      return reordered
    })
  }

  const handleMoveDown = (index: number) => {
    setPhrases((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      const reordered = next.map((p, i) => ({ ...p, order: i }))
      if (userId.current) syncAllPhrasesToFirestore(userId.current, reordered)
      return reordered
    })
  }

  const handleStartEdit = (phrase: SavedPhrase) => {
    setEditingId(phrase.id)
    setEditText(phrase.text)
    setEditLabel(phrase.label)
  }

  const handleSaveEdit = (id: string) => {
    if (editText.length > MAX_CHARS) return
    setPhrases((prev) => {
      const next = prev.map((p) =>
        p.id === id
          ? { ...p, text: editText.trim(), label: editLabel.trim() || editText.trim().slice(0, 40) }
          : p,
      )
      const updated = next.find((p) => p.id === id)
      if (userId.current && updated) updatePhraseInFirestore(userId.current, updated)
      return next
    })
    setEditingId(null)
  }

  const handleInsert = (phrase: SavedPhrase) => {
    onInsert?.(phrase.text)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-semibold">Saved Phrases</h2>

      {/* Add phrase form */}
      <section aria-labelledby="add-phrase-heading" className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 id="add-phrase-heading" className="font-medium mb-3">Add phrase</h3>
        <div className="flex flex-col gap-2">
          <div>
            <label htmlFor="new-phrase-text" className="block text-sm mb-1">
              Phrase text <span className="text-gray-400">({newText.length}/{MAX_CHARS})</span>
            </label>
            <textarea
              id="new-phrase-text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              maxLength={MAX_CHARS}
              rows={2}
              placeholder="Enter phrase…"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              aria-label="New phrase text"
              aria-describedby={addError ? 'add-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="new-phrase-label" className="block text-sm mb-1">Label (optional)</label>
            <input
              id="new-phrase-label"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Short label…"
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="New phrase label"
            />
          </div>
          {addError && (
            <div id="add-error" role="alert" className="text-red-600 text-sm">
              {addError}
            </div>
          )}
          <button
            onClick={handleAdd}
            className="self-start rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Save new phrase"
          >
            Save phrase
          </button>
          <p className="text-xs text-gray-500">{phrases.length}/{MAX_PHRASES} phrases saved</p>
        </div>
      </section>

      {/* Phrase list */}
      <ul aria-label="Saved phrases list" className="flex flex-col gap-2">
        {phrases.map((phrase, index) => (
          <li
            key={phrase.id}
            className="rounded-lg border border-gray-200 bg-white p-3"
          >
            {editingId === phrase.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={MAX_CHARS}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm resize-none"
                  aria-label="Edit phrase text"
                />
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Label"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  aria-label="Edit phrase label"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(phrase.id)}
                    className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                    aria-label="Save edit"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
                    aria-label="Cancel edit"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <button
                  onClick={() => handleInsert(phrase)}
                  className="flex-1 text-left rounded hover:bg-blue-50 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Insert phrase: ${phrase.label}`}
                >
                  <span className="block font-medium text-sm">{phrase.label}</span>
                  <span className="block text-xs text-gray-500 truncate">{phrase.text}</span>
                </button>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                    aria-label={`Move phrase up: ${phrase.label}`}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === phrases.length - 1}
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                    aria-label={`Move phrase down: ${phrase.label}`}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleStartEdit(phrase)}
                    className="rounded p-1 hover:bg-gray-100 text-blue-600"
                    aria-label={`Edit phrase: ${phrase.label}`}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(phrase.id)}
                    className="rounded p-1 hover:bg-gray-100 text-red-600"
                    aria-label={`Delete phrase: ${phrase.label}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {phrases.length === 0 && (
          <li className="text-center text-gray-400 py-6 text-sm">No saved phrases yet</li>
        )}
      </ul>
    </div>
  )
}
