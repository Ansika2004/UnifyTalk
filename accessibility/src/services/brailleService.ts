/**
 * Braille Display Service — WebHID API
 *
 * Supports HID braille display detection, connection, real-time text
 * transmission, and graceful disconnect handling (Req 10.1, 10.2, 10.3).
 *
 * Gracefully degrades to no-ops when WebHID is not available (most browsers).
 */

// ─── ASCII → Braille byte mapping (Grade 1 Braille, 8-dot) ──────────────────
// Each byte encodes which of the 8 dots are raised (bits 0-7 = dots 1-8).
// Dots layout: 1 4 / 2 5 / 3 6 / 7 8  (standard 8-dot braille cell)
const ASCII_TO_BRAILLE: Record<string, number> = {
  ' ': 0x00,
  a: 0x01, b: 0x03, c: 0x09, d: 0x19, e: 0x11,
  f: 0x0b, g: 0x1b, h: 0x13, i: 0x0a, j: 0x1a,
  k: 0x05, l: 0x07, m: 0x0d, n: 0x1d, o: 0x15,
  p: 0x0f, q: 0x1f, r: 0x17, s: 0x0e, t: 0x1e,
  u: 0x25, v: 0x27, w: 0x3a, x: 0x2d, y: 0x3d,
  z: 0x35,
  '0': 0x1a, '1': 0x01, '2': 0x03, '3': 0x09, '4': 0x19,
  '5': 0x11, '6': 0x0b, '7': 0x1b, '8': 0x13, '9': 0x0a,
  '.': 0x40, ',': 0x20, '?': 0x62, '!': 0x16, ':': 0x30,
  ';': 0x22, '-': 0x24, '\'': 0x04, '"': 0x04,
}

/** Convert a text string to an array of braille bytes. */
export function textToBrailleBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toLowerCase()
    bytes[i] = ASCII_TO_BRAILLE[ch] ?? 0x00
  }
  return bytes
}

// ─── HID device filters for common braille display vendors ──────────────────
// Usage page 0x0001 (Generic Desktop), usage 0x0001 is a common HID filter;
// real braille displays use usage page 0x0041 (Braille Display).
const BRAILLE_HID_FILTERS: HIDDeviceFilter[] = [
  { usagePage: 0x0041 }, // Braille Display usage page
  { vendorId: 0x0403 },  // FTDI (Freedom Scientific, Humanware)
  { vendorId: 0x1c71 },  // Humanware
  { vendorId: 0x0798 },  // Humanware (alternate)
  { vendorId: 0x10c4 },  // Silicon Labs (various braille devices)
]

// ─── Module state ────────────────────────────────────────────────────────────
let _connectedDevice: HIDDevice | null = null
let _disconnectCallbacks: Array<() => void> = []

// ─── WebHID availability check ───────────────────────────────────────────────
function isWebHIDSupported(): boolean {
  return typeof navigator !== 'undefined' && 'hid' in navigator
}

// ─── Internal: attach disconnect listener to a device ───────────────────────
function _attachDisconnectListener(device: HIDDevice): void {
  if (!isWebHIDSupported()) return
  navigator.hid.addEventListener('disconnect', (event: HIDConnectionEvent) => {
    if (event.device === device) {
      _connectedDevice = null
      _disconnectCallbacks.forEach((cb) => cb())
    }
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Request access to a HID braille display and open the connection.
 * Returns the connected HIDDevice, or null if unavailable / user cancelled.
 * (Req 10.2 — standard HID braille display protocols)
 */
export async function connectBrailleDisplay(): Promise<HIDDevice | null> {
  if (!isWebHIDSupported()) {
    console.warn('[BrailleService] WebHID not supported in this browser.')
    return null
  }
  try {
    const devices = await navigator.hid.requestDevice({ filters: BRAILLE_HID_FILTERS })
    if (!devices || devices.length === 0) return null
    const device = devices[0]
    if (!device.opened) {
      await device.open()
    }
    _connectedDevice = device
    _attachDisconnectListener(device)
    console.info('[BrailleService] Connected to braille display:', device.productName)
    return device
  } catch (err) {
    console.error('[BrailleService] Failed to connect to braille display:', err)
    return null
  }
}

/**
 * Close the active HID braille display connection.
 */
export async function disconnectBrailleDisplay(): Promise<void> {
  if (!_connectedDevice) return
  try {
    if (_connectedDevice.opened) {
      await _connectedDevice.close()
    }
  } catch (err) {
    console.warn('[BrailleService] Error closing braille display:', err)
  } finally {
    _connectedDevice = null
  }
}

/**
 * Returns true if a braille display is currently connected and open.
 * (Req 10.1)
 */
export function isBrailleConnected(): boolean {
  return _connectedDevice !== null && _connectedDevice.opened
}

/**
 * @deprecated Use isBrailleConnected() instead.
 * Kept for backward compatibility.
 */
export function isBrailleDisplayConnected(): boolean {
  return isBrailleConnected()
}

/**
 * Send text to the connected braille display in real time.
 * Converts text to braille bytes and writes via HID report.
 * No-op if no device is connected.
 * (Req 10.1 — transmit all text content in real time)
 */
export async function sendToBraille(text: string): Promise<void> {
  if (!isBrailleConnected() || !_connectedDevice) {
    console.warn('[BrailleService] No braille display connected. Text:', text)
    return
  }
  try {
    const bytes = textToBrailleBytes(text)
    // HID report ID 0 is used for devices with a single report
    await _connectedDevice.sendReport(0, bytes)
  } catch (err) {
    console.error('[BrailleService] Failed to send to braille display:', err)
  }
}

/**
 * Register a callback invoked when the braille display disconnects.
 * (Req 10.3 — notify on disconnect)
 */
export function onBrailleDisconnect(callback: () => void): () => void {
  _disconnectCallbacks.push(callback)
  // Return an unsubscribe function
  return () => {
    _disconnectCallbacks = _disconnectCallbacks.filter((cb) => cb !== callback)
  }
}

/**
 * @deprecated Use onBrailleDisconnect() instead.
 */
export function onDisconnect(callback: () => void): void {
  onBrailleDisconnect(callback)
}
