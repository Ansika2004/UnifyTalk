/**
 * Doctor_Bridge service — writes chat messages to Firestore.
 * Requirements: 3.7, 6.1, 6.2
 */
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getDb } from '../firebase'
import type { ChatMessage } from '../types'


/**
 * Write a ChatMessage to /channels/{channelId}/messages/{messageId}.
 * Returns the generated messageId.
 */
export async function sendMessage(
  channelId: string,
  senderId: string,
  senderRole: 'patient' | 'staff',
  content: string,
  inputModality: ChatMessage['inputModality'],
): Promise<string> {
  const db = getDb()
  if (!db) return 'offline'
  const messagesRef = collection(db, 'channels', channelId, 'messages')

  const docRef = await addDoc(messagesRef, {
    channelId,
    senderId,
    senderRole,
    content,
    inputModality,
    timestamp: serverTimestamp(),
  })

  return docRef.id
}
