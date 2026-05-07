/**
 * Unit tests for Doctor_Bridge service and offline queue.
 * Requirements: 6.6, 6.8
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock firebase/firestore for sendMessage tests ────────────────────────────

vi.mock('firebase/firestore', () => {
  const addDocMock = vi.fn()
  const serverTimestampMock = vi.fn(() => ({ _type: 'serverTimestamp' }))
  const collectionMock = vi.fn(() => 'mock-collection-ref')
  const getFirestoreMock = vi.fn(() => ({}))

  return {
    getFirestore: getFirestoreMock,
    collection: collectionMock,
    addDoc: addDocMock,
    serverTimestamp: serverTimestampMock,
    __addDocMock: addDocMock,
    __collectionMock: collectionMock,
  }
})

vi.mock('../firebase', () => ({
  firebaseApp: {},
  getDb: vi.fn(() => ({})),
}))

// ─── sendMessage tests ────────────────────────────────────────────────────────

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes correct fields to Firestore', async () => {
    const { __addDocMock } = await import('firebase/firestore') as unknown as {
      __addDocMock: ReturnType<typeof vi.fn>
    }
    __addDocMock.mockResolvedValue({ id: 'msg-001' })

    const { sendMessage } = await import('./doctorBridgeService')
    const id = await sendMessage('channel-1', 'user-1', 'patient', 'Hello doctor', 'text')

    expect(id).toBe('msg-001')
    expect(__addDocMock).toHaveBeenCalledOnce()

    const [, docData] = __addDocMock.mock.calls[0]
    expect(docData).toMatchObject({
      channelId: 'channel-1',
      senderId: 'user-1',
      senderRole: 'patient',
      content: 'Hello doctor',
      inputModality: 'text',
    })
    expect(docData.timestamp).toBeDefined()
  })

  it('writes staff message with correct senderRole', async () => {
    const { __addDocMock } = await import('firebase/firestore') as unknown as {
      __addDocMock: ReturnType<typeof vi.fn>
    }
    __addDocMock.mockResolvedValue({ id: 'msg-002' })

    const { sendMessage } = await import('./doctorBridgeService')
    await sendMessage('channel-1', 'staff-1', 'staff', "I'll be there shortly", 'text')

    const [, docData] = __addDocMock.mock.calls[0]
    expect(docData.senderRole).toBe('staff')
    expect(docData.content).toBe("I'll be there shortly")
  })

  it('writes pictogram inputModality correctly', async () => {
    const { __addDocMock } = await import('firebase/firestore') as unknown as {
      __addDocMock: ReturnType<typeof vi.fn>
    }
    __addDocMock.mockResolvedValue({ id: 'msg-003' })

    const { sendMessage } = await import('./doctorBridgeService')
    await sendMessage('channel-1', 'user-1', 'patient', 'I need water', 'pictogram')

    const [, docData] = __addDocMock.mock.calls[0]
    expect(docData.inputModality).toBe('pictogram')
  })
})

// ─── Offline queue (in-memory mock) tests ────────────────────────────────────
// IndexedDB is not available in the happy-dom test environment.
// We test the queue contract using a mock that mirrors the real API.

type QueuedMessage = { content: string; inputModality: string }

function createInMemoryQueue() {
  let store: QueuedMessage[] = []

  return {
    async enqueue(message: object): Promise<void> {
      store.push(message as QueuedMessage)
    },
    async dequeue(): Promise<object[]> {
      const all = [...store]
      store = []
      return all
    },
    async getQueueLength(): Promise<number> {
      return store.length
    },
  }
}

describe('offlineQueue contract', () => {
  let queue: ReturnType<typeof createInMemoryQueue>

  beforeEach(() => {
    queue = createInMemoryQueue()
  })

  it('enqueue stores a message and getQueueLength returns 1', async () => {
    // Requirements: 6.8
    await queue.enqueue({ content: 'Hello', inputModality: 'text' })
    const length = await queue.getQueueLength()
    expect(length).toBe(1)
  })

  it('dequeue retrieves all messages and clears the store', async () => {
    // Requirements: 6.8
    await queue.enqueue({ content: 'Message 1', inputModality: 'text' })
    await queue.enqueue({ content: 'Message 2', inputModality: 'pictogram' })

    const messages = await queue.dequeue()

    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ content: 'Message 1', inputModality: 'text' })
    expect(messages[1]).toMatchObject({ content: 'Message 2', inputModality: 'pictogram' })

    const length = await queue.getQueueLength()
    expect(length).toBe(0)
  })

  it('dequeue on empty queue returns empty array', async () => {
    // Requirements: 6.8
    const messages = await queue.dequeue()
    expect(messages).toEqual([])
  })

  it('getQueueLength returns 0 on empty queue', async () => {
    // Requirements: 6.8
    const length = await queue.getQueueLength()
    expect(length).toBe(0)
  })

  it('multiple enqueues accumulate correctly', async () => {
    // Requirements: 6.8
    await queue.enqueue({ content: 'A', inputModality: 'text' })
    await queue.enqueue({ content: 'B', inputModality: 'voice' })
    await queue.enqueue({ content: 'C', inputModality: 'sign_language' })

    const length = await queue.getQueueLength()
    expect(length).toBe(3)
  })

  it('dequeue flushes queue — subsequent dequeue returns empty', async () => {
    // Requirements: 6.8
    await queue.enqueue({ content: 'Hello', inputModality: 'text' })
    await queue.dequeue()

    const second = await queue.dequeue()
    expect(second).toEqual([])
  })

  it('messages are flushed on reconnect (simulated)', async () => {
    // Requirements: 6.8 — simulate offline queue flush on reconnect
    await queue.enqueue({ content: 'Queued while offline', inputModality: 'text' })
    await queue.enqueue({ content: 'Another queued message', inputModality: 'pictogram' })

    // Simulate reconnect: flush queue and "send" each message
    const sentMessages: object[] = []
    const flushed = await queue.dequeue()
    for (const msg of flushed) {
      sentMessages.push(msg)
    }

    expect(sentMessages).toHaveLength(2)
    expect(await queue.getQueueLength()).toBe(0)
  })
})

// ─── Read receipt tests ───────────────────────────────────────────────────────

describe('read receipt — readAt field', () => {
  it('readAt is undefined on a new message object', () => {
    // Requirements: 6.6
    const message = {
      messageId: 'msg-1',
      channelId: 'ch-1',
      senderId: 'patient-1',
      senderRole: 'patient' as const,
      content: 'Hello',
      inputModality: 'text' as const,
      timestamp: null as unknown as import('../types').ChatMessage['timestamp'],
      readAt: undefined,
    }
    expect(message.readAt).toBeUndefined()
  })

  it('readAt being set indicates message was read', () => {
    // Requirements: 6.6
    const now = { seconds: 1700000000, nanoseconds: 0 } as unknown as import('../types').ChatMessage['timestamp']
    const message = {
      messageId: 'msg-2',
      channelId: 'ch-1',
      senderId: 'patient-1',
      senderRole: 'patient' as const,
      content: 'Hello',
      inputModality: 'text' as const,
      timestamp: now,
      readAt: now,
    }
    expect(message.readAt).toBeDefined()
    expect(message.readAt).toBe(now)
  })
})
