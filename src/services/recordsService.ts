/**
 * Records service — fetches medical records from a configurable hospital REST API,
 * handles PDF upload to Firebase Storage, and provides offline cache fallback.
 * Requirements: 5.1, 5.5, 5.7
 */

import type { MedicalRecord } from '../types'

export interface RecordFilters {
  startDate?: Date
  endDate?: Date
  testType?: string
  orderingDoctor?: string
}

/**
 * Pure function: filter records by date range, test type, and ordering doctor.
 * All string comparisons are case-insensitive.
 * Requirements: 5.5
 */
export function filterRecords(
  records: MedicalRecord[],
  filters: RecordFilters
): MedicalRecord[] {
  return records.filter((record) => {
    const recordDate = record.date.toDate()

    if (filters.startDate && recordDate < filters.startDate) return false
    if (filters.endDate && recordDate > filters.endDate) return false

    if (filters.testType) {
      const needle = filters.testType.toLowerCase()
      if (!record.testType.toLowerCase().includes(needle)) return false
    }

    if (filters.orderingDoctor) {
      const needle = filters.orderingDoctor.toLowerCase()
      if (!record.orderingDoctor.toLowerCase().includes(needle)) return false
    }

    return true
  })
}

/**
 * Fetch records from the hospital REST API.
 * Falls back to cached Firestore records on error.
 * Requirements: 5.1, 5.7
 */
export async function fetchRecords(patientId: string): Promise<MedicalRecord[]> {
  const apiUrl = import.meta.env.VITE_HOSPITAL_API_URL as string | undefined

  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/records?patientId=${patientId}`)
      if (!response.ok) {
        throw new Error(`Hospital API error: ${response.status}`)
      }
      const data = (await response.json()) as MedicalRecord[]
      return data
    } catch (err) {
      console.warn('[RecordsService] Hospital API unavailable, falling back to cache:', err)
    }
  }

  // Fallback: load from Firestore cache
  return loadCachedRecords(patientId)
}

/**
 * Load cached records from Firestore /records collection for a patient.
 * Requirements: 5.7
 */
export async function loadCachedRecords(patientId: string): Promise<MedicalRecord[]> {
  try {
    const { getFirestore, collection, query, where, getDocs } = await import(
      'firebase/firestore'
    )
    const { firebaseApp } = await import('../firebase')
    const db = getFirestore(firebaseApp)

    const q = query(
      collection(db, 'records'),
      where('patientId', '==', patientId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => doc.data() as MedicalRecord)
  } catch (err) {
    console.error('[RecordsService] Failed to load cached records:', err)
    return []
  }
}

/**
 * Upload a PDF file to Firebase Storage and write metadata to Firestore.
 * Requirements: 5.1
 */
export async function uploadRecord(
  patientId: string,
  file: File,
  meta: { orderingDoctor: string; testType: string }
): Promise<string> {
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('@firebase/storage')
  const { getFirestore, collection, addDoc, Timestamp } = await import('@firebase/firestore')
  const { firebaseApp } = await import('../firebase')

  const storage = getStorage(firebaseApp)
  const db = getFirestore(firebaseApp)

  const recordId = `${patientId}_${Date.now()}`
  const storageRef = ref(storage, `records/${patientId}/${recordId}.pdf`)

  await uploadBytes(storageRef, file)
  const originalUrl = await getDownloadURL(storageRef)

  await addDoc(collection(db, 'records'), {
    recordId,
    patientId,
    date: Timestamp.now(),
    orderingDoctor: meta.orderingDoctor,
    testType: meta.testType,
    originalUrl,
    plainLanguageSummary: '',
    cachedAt: Timestamp.now(),
  } satisfies MedicalRecord)

  return recordId
}
