import React, { useState, useCallback } from 'react'
import type { Pictogram, PictogramCategory } from '../types/index'
import { PICTOGRAMS } from '../data/pictograms'

export interface PictogramBoardProps {
  onSend: (symbols: Pictogram[]) => void
}

const CATEGORIES: PictogramCategory[] = ['needs', 'pain', 'emotions', 'food', 'people']

const CATEGORY_LABELS: Record<PictogramCategory, string> = {
  needs: 'Needs',
  pain: 'Pain',
  emotions: 'Emotions',
  food: 'Food',
  people: 'People',
}

export const PictogramBoard: React.FC<PictogramBoardProps> = ({ onSend }) => {
  const [composition, setComposition] = useState<Pictogram[]>([])
  const [activeCategory, setActiveCategory] = useState<PictogramCategory>('needs')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPictograms = PICTOGRAMS.filter((p) => {
    const matchesCategory = searchQuery.trim() === '' ? p.category === activeCategory : true
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      q === '' ||
      p.label.toLowerCase().includes(q) ||
      p.keywords.some((k) => k.toLowerCase().includes(q))
    return matchesCategory && matchesSearch
  })

  const addSymbol = useCallback((pictogram: Pictogram) => {
    setComposition((prev) => [...prev, pictogram])
  }, [])

  const removeSymbol = useCallback((index: number) => {
    setComposition((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const moveSymbol = useCallback((index: number, direction: 'up' | 'down') => {
    setComposition((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }, [])

  const handleSend = useCallback(() => {
    if (composition.length === 0) return
    onSend([...composition])
    setComposition([])
  }, [composition, onSend])

  return (
    <div
      role="region"
      aria-label="Pictogram Communication Board"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'sans-serif',
        fontSize: '16px',
      }}
    >
      {/* Composition area */}
      <div
        aria-label="Message composition area"
        style={{
          minHeight: 100,
          background: '#f0f4ff',
          border: '2px solid #4a6cf7',
          borderRadius: 8,
          padding: 8,
          marginBottom: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        {composition.length === 0 ? (
          <span style={{ color: '#888', alignSelf: 'center', padding: '0 8px' }}>
            Tap symbols below to compose a message
          </span>
        ) : (
          composition.map((symbol, index) => (
            <div
              key={`${symbol.id}-${index}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: '#fff',
                border: '1px solid #c0c8f0',
                borderRadius: 6,
                padding: 4,
                position: 'relative',
                minWidth: 72,
              }}
            >
              <img
                src={symbol.iconUrl}
                alt={symbol.label}
                style={{ width: 48, height: 48, objectFit: 'contain' }}
              />
              <span style={{ fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                {symbol.label}
              </span>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                <button
                  onClick={() => moveSymbol(index, 'up')}
                  disabled={index === 0}
                  aria-label={`Move ${symbol.label} left`}
                  style={arrowBtnStyle(index === 0)}
                >
                  ◀
                </button>
                <button
                  onClick={() => removeSymbol(index)}
                  aria-label={`Remove ${symbol.label}`}
                  style={{
                    background: '#e53e3e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    width: 22,
                    height: 22,
                    cursor: 'pointer',
                    fontSize: 12,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
                <button
                  onClick={() => moveSymbol(index, 'down')}
                  disabled={index === composition.length - 1}
                  aria-label={`Move ${symbol.label} right`}
                  style={arrowBtnStyle(index === composition.length - 1)}
                >
                  ▶
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={composition.length === 0}
        aria-label="Send composed message"
        aria-disabled={composition.length === 0}
        style={{
          alignSelf: 'flex-end',
          marginBottom: 12,
          padding: '10px 24px',
          background: composition.length === 0 ? '#ccc' : '#4a6cf7',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 600,
          cursor: composition.length === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        Send
      </button>

      {/* Search input */}
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search symbols by keyword…"
        aria-label="Search pictograms"
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 16,
          border: '2px solid #c0c8f0',
          borderRadius: 6,
          marginBottom: 10,
          boxSizing: 'border-box',
        }}
      />

      {/* Category tabs */}
      {searchQuery.trim() === '' && (
        <div
          role="tablist"
          aria-label="Pictogram categories"
          style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 16px',
                border: '2px solid #4a6cf7',
                borderRadius: 20,
                background: activeCategory === cat ? '#4a6cf7' : '#fff',
                color: activeCategory === cat ? '#fff' : '#4a6cf7',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Symbol grid */}
      <div
        role="grid"
        aria-label="Pictogram symbol grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
          gap: 8,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {filteredPictograms.length === 0 ? (
          <p style={{ gridColumn: '1 / -1', color: '#888', textAlign: 'center', padding: 24 }}>
            No symbols found
          </p>
        ) : (
          filteredPictograms.map((pictogram) => (
            <button
              key={pictogram.id}
              role="gridcell"
              onClick={() => addSymbol(pictogram)}
              aria-label={`Add ${pictogram.label}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 8,
                border: '2px solid #e2e8f0',
                borderRadius: 8,
                background: '#fff',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#4a6cf7'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'
              }}
            >
              <img
                src={pictogram.iconUrl}
                alt=""
                aria-hidden="true"
                style={{ width: 64, height: 64, objectFit: 'contain' }}
              />
              <span style={{ fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 1.2 }}>
                {pictogram.label}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function arrowBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? '#eee' : '#e2e8f0',
    color: disabled ? '#bbb' : '#333',
    border: 'none',
    borderRadius: 4,
    width: 22,
    height: 22,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 10,
    lineHeight: 1,
    padding: 0,
  }
}

export default PictogramBoard
