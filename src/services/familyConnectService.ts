/**
 * Family_Connect service — token generation, validation, and revocation.
 * Requirements: 14.1, 14.6, 14.7
 */
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  Timestamp,
} from 'firebase/firestore'
import type { FamilyAccessLink, FamilyConsentSettings } from '../types'

const LINK_TTL_MS = 72 * 60 * 60 * 1000 // 72 hours

/** Generate a UUID v4 token */
function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Pure helper: check if a token is expired */
export function isTokenExpired(expiresAt: Timestamp): boolean {
  return expiresAt.toMillis() < Date.now()
}

/** Pure helper: check if a token is revoked */
export function isTokenRevoked(revokedAt?: Timestamp): boolean {
  return revokedAt !== undefined && revokedAt !== null
}

/** Pure factory: build a FamilyAccessLink object (without writing to Firestore) */
export function buildFamilyAccessLink(
  patientId: string,
  createdBy: string,
  consentSettings: FamilyConsentSettings,
  token?: string,
): FamilyAccessLink {
  const t = token ?? generateToken()
  return {
    token: t,
    patientId,
    createdBy,
    expiresAt: Timestamp.fromMillis(Date.now() + LINK_TTL_MS),
    consentSettings,
  }
}

async function getDb() {
  const { firebaseApp } = await import('../firebase')
  const { getFirestore } = await import('firebase/firestore')
  return getFirestore(firebaseApp)
}

/**
 * Generate a family access link and write it to Firestore.
 * Logs the event to /audit_log.
 * Requirements: 14.1, 14.7
 */
export async function generateFamilyLink(
  patientId: string,
  createdBy: string,
  consentSettings: FamilyConsentSettings,
): Promise<string> {
  const db = await getDb()
  const link = buildFamilyAccessLink(patientId, createdBy, consentSettings)

  await setDoc(doc(db, 'family_links', link.token), link)

  // Audit log (Req 14.7)
  await addDoc(collection(db, 'audit_log'), {
    eventType: 'family_link_generated',
    actorId: createdBy,
    actorRole: 'patient_or_staff',
    patientId,
    timestamp: Timestamp.now(),
    metadata: { token: link.token, expiresAt: link.expiresAt },
  })

  return link.token
}

/**
 * Validate a family token — returns the link if valid, null if expired/revoked/missing.
 * Requirements: 14.1, 14.6
 */
export async function validateFamilyToken(token: string): Promise<FamilyAccessLink | null> {
  const db = await getDb()
  const snap = await getDoc(doc(db, 'family_links', token))
  if (!snap.exists()) return null

  const link = snap.data() as FamilyAccessLink
  if (isTokenExpired(link.expiresAt)) return null
  if (isTokenRevoked(link.revokedAt)) return null

  return link
}

/**
 * Revoke a family access link by setting revokedAt.
 * Requirements: 14.6
 */
export async function revokeFamilyLink(token: string): Promise<void> {
  const db = await getDb()
  await updateDoc(doc(db, 'family_links', token), {
    revokedAt: Timestamp.now(),
  })
}
