// WCAG Accessibility Utility Functions

/**
 * Parse a CSS color string (hex or rgb) to [r, g, b] 0-255.
 */
function parseColor(color: string): [number, number, number] {
  const hex = color.trim()
  if (hex.startsWith('#')) {
    const full = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex
    const r = parseInt(full.slice(1, 3), 16)
    const g = parseInt(full.slice(3, 5), 16)
    const b = parseInt(full.slice(5, 7), 16)
    return [r, g, b]
  }
  const match = hex.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
  }
  return [0, 0, 0]
}

/**
 * Compute relative luminance per WCAG 2.1.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * Compute contrast ratio between two CSS color strings.
 * Returns a value between 1 and 21.
 */
export function computeContrastRatio(fg: string, bg: string): number {
  const [fr, fg2, fb] = parseColor(fg)
  const [br, bg2, bb] = parseColor(bg)
  const l1 = relativeLuminance(fr, fg2, fb)
  const l2 = relativeLuminance(br, bg2, bb)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** WCAG AA: contrast ratio ≥ 4.5 for normal text */
export function meetsWCAGAA(ratio: number): boolean {
  return ratio >= 4.5
}

/** WCAG AAA: contrast ratio ≥ 7.0 */
export function meetsWCAGAAA(ratio: number): boolean {
  return ratio >= 7.0
}

/**
 * Check if a flash interval is safe per WCAG 2.3.1 (≤3 flashes/sec = ≥333ms).
 */
export function isValidFlashRate(intervalMs: number): boolean {
  return intervalMs >= 333
}
