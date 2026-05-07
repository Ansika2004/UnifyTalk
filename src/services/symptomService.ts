import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getDb } from '../firebase'
import type { SymptomReport } from '../types/index'

export async function submitSymptomReport(
  report: Omit<SymptomReport, 'timestamp'>
): Promise<string> {
  const db = getDb()
  if (!db) return 'offline'
  const docRef = await addDoc(collection(db, 'symptom_reports'), {
    ...report,
    timestamp: serverTimestamp(),
  })
  return docRef.id
}
