import { useState, useId } from 'react'
import type { ForumPost, MediaAttachment } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const FORUM_KEY = 'forum_posts_cache'

/** Req 21.5 — content moderation keyword list */
export const MODERATION_KEYWORDS = [
  'badword1', 'badword2', 'spam', 'hate', 'abuse',
  'violence', 'harassment', 'slur', 'threat', 'explicit',
]

/** Req 21.1 — at least 5 emoji reactions */
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢']

/** Req 21 — topic boards (General, Resources, Support + extras) */
export const TOPIC_BOARDS = ['General', 'Resources', 'Support', 'Deaf Community', 'AAC Users']

/** Resource library links */
export const RESOURCE_LINKS = [
  { label: 'National Deaf Center', url: 'https://www.nationaldeafcenter.org' },
  { label: 'AAC Institute', url: 'https://www.aacinstitute.org' },
  { label: 'American Foundation for the Blind', url: 'https://www.afb.org' },
  { label: 'WCAG 2.1 Guidelines', url: 'https://www.w3.org/WAI/WCAG21/quickref/' },
]

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadPosts(): ForumPost[] {
  try {
    return JSON.parse(localStorage.getItem(FORUM_KEY) ?? '[]') as ForumPost[]
  } catch {
    return []
  }
}

function savePosts(posts: ForumPost[]): void {
  try {
    localStorage.setItem(FORUM_KEY, JSON.stringify(posts))
  } catch { /* ignore */ }
}

// ─── Moderation ───────────────────────────────────────────────────────────────

/** Req 21.5 — returns the matched keyword or null */
export function detectViolation(text: string): string | null {
  const lower = text.toLowerCase()
  const found = MODERATION_KEYWORDS.find((w) => lower.includes(w))
  return found ?? null
}

// ─── Flag logic (exported for tests) ─────────────────────────────────────────

export interface FlagResult {
  flaggedBy: string[]
  isHidden: boolean
}

/** Req 21.2 — hide after 3 distinct user flags */
export function applyFlag(current: FlagResult, userId: string): FlagResult {
  if (current.flaggedBy.includes(userId)) return current
  const flaggedBy = [...current.flaggedBy, userId]
  return { flaggedBy, isHidden: flaggedBy.length >= 3 }
}

// ─── Submission validation (exported for tests) ───────────────────────────────

export interface AttachmentDraft {
  type: 'image' | 'audio' | 'video'
  url: string
  altText: string
  captionUrl: string
}

/** Req 21.4 — images need altText, audio/video need captionUrl */
export function validateAttachment(draft: AttachmentDraft): string | null {
  if (!draft.url.trim()) return null // no attachment — OK
  if (draft.type === 'image' && !draft.altText.trim()) {
    return 'Images require alt text. Please describe the image for screen reader users.'
  }
  if ((draft.type === 'audio' || draft.type === 'video') && !draft.captionUrl.trim()) {
    return 'Audio and video content requires a captions file URL (SRT or VTT).'
  }
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommunityForum() {
  const uid = useId()
  const [posts, setPosts] = useState<ForumPost[]>(loadPosts)
  const [activeBoard, setActiveBoard] = useState(TOPIC_BOARDS[0])
  const [showResources, setShowResources] = useState(false)

  // New post form state
  const [newContent, setNewContent] = useState('')
  const [attachment, setAttachment] = useState<AttachmentDraft>({
    type: 'image',
    url: '',
    altText: '',
    captionUrl: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Reply state: postId → draft text
  const [replyContent, setReplyContent] = useState<Record<string, string>>({})
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({})

  const userId = 'local-user'

  // ── Post submission ──────────────────────────────────────────────────────────

  function submitPost() {
    setError(null)
    setSuccessMsg(null)

    if (!newContent.trim()) {
      setError('Post content cannot be empty.')
      return
    }

    // Req 21.5 — content moderation
    const violation = detectViolation(newContent)
    if (violation) {
      setError(
        `Your post contains content that violates community guidelines (detected: "${violation}"). Please revise and try again.`,
      )
      return
    }

    // Req 21.4 — attachment validation
    const attachErr = validateAttachment(attachment)
    if (attachErr) {
      setError(attachErr)
      return
    }

    const attachments: MediaAttachment[] = attachment.url.trim()
      ? [
          {
            type: attachment.type,
            url: attachment.url.trim(),
            ...(attachment.type === 'image' ? { altText: attachment.altText.trim() } : {}),
            ...(attachment.type !== 'image' ? { captionUrl: attachment.captionUrl.trim() } : {}),
          },
        ]
      : []

    const post: ForumPost = {
      id: `post-${Date.now()}`,
      authorId: userId,
      content: newContent.trim(),
      attachments,
      reactions: {},
      flaggedBy: [],
      isHidden: false,
      createdAt: Date.now(),
    }

    const updated = [post, ...posts]
    setPosts(updated)
    savePosts(updated)
    setNewContent('')
    setAttachment({ type: 'image', url: '', altText: '', captionUrl: '' })
    setSuccessMsg('Post published successfully.')
  }

  // ── Reactions ────────────────────────────────────────────────────────────────

  function addReaction(postId: string, emoji: string) {
    const updated = posts.map((p) => {
      if (p.id !== postId) return p
      const existing = p.reactions[emoji] ?? []
      const already = existing.includes(userId)
      return {
        ...p,
        reactions: {
          ...p.reactions,
          [emoji]: already
            ? existing.filter((u) => u !== userId)
            : [...existing, userId],
        },
      }
    })
    setPosts(updated)
    savePosts(updated)
  }

  // ── Flagging ─────────────────────────────────────────────────────────────────

  function flagPost(postId: string) {
    const updated = posts.map((p) => {
      if (p.id !== postId) return p
      const result = applyFlag({ flaggedBy: p.flaggedBy, isHidden: p.isHidden }, userId)
      return { ...p, ...result }
    })
    setPosts(updated)
    savePosts(updated)
  }

  // ── Replies ──────────────────────────────────────────────────────────────────

  function submitReply(parentId: string) {
    const content = replyContent[parentId]?.trim()
    if (!content) return

    const violation = detectViolation(content)
    if (violation) {
      setReplyErrors((prev) => ({
        ...prev,
        [parentId]: `Reply contains prohibited content (detected: "${violation}").`,
      }))
      return
    }

    const reply: ForumPost = {
      id: `reply-${parentId}-${Date.now()}`,
      authorId: userId,
      content,
      attachments: [],
      reactions: {},
      flaggedBy: [],
      isHidden: false,
      createdAt: Date.now(),
    }

    // Store replies as posts with a parentId convention in the id
    const updated = [...posts, reply]
    setPosts(updated)
    savePosts(updated)
    setReplyContent((prev) => ({ ...prev, [parentId]: '' }))
    setReplyErrors((prev) => ({ ...prev, [parentId]: '' }))
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const topLevelPosts = posts.filter(
    (p) => !p.isHidden && !p.id.startsWith('reply-'),
  )

  function getReplies(postId: string) {
    return posts.filter(
      (p) => !p.isHidden && p.id.startsWith(`reply-${postId}-`),
    )
  }

  // ── IDs for accessibility ────────────────────────────────────────────────────

  const postContentId = `${uid}-post-content`
  const attachTypeId = `${uid}-attach-type`
  const attachUrlId = `${uid}-attach-url`
  const attachAltId = `${uid}-attach-alt`
  const attachCaptionId = `${uid}-attach-caption`
  const errorId = `${uid}-error`
  const successId = `${uid}-success`

  return (
    <div className="flex flex-col gap-4 p-4" id="community-forum">
      <h2 className="text-xl font-bold" id="forum-heading">Community Forum</h2>

      {/* ── Topic boards (Req 21 — General, Resources, Support + extras) ── */}
      <nav aria-label="Topic boards" role="navigation">
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0" role="list">
          {TOPIC_BOARDS.map((board) => (
            <li key={board} role="listitem">
              <button
                onClick={() => setActiveBoard(board)}
                aria-pressed={activeBoard === board}
                aria-label={`Switch to ${board} board${activeBoard === board ? ', currently selected' : ''}`}
                className={`rounded-full px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  activeBoard === board
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {board}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Resource library ── */}
      <section aria-labelledby="resources-heading">
        <button
          onClick={() => setShowResources((v) => !v)}
          aria-expanded={showResources}
          aria-controls="resource-library"
          className="text-sm text-blue-600 underline text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          id="resources-heading"
        >
          {showResources ? 'Hide' : 'Show'} Resource Library
        </button>
        {showResources && (
          <ul
            id="resource-library"
            className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1 mt-2"
            aria-label="Accessibility resource links"
          >
            {RESOURCE_LINKS.map((r) => (
              <li key={r.url}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label={`${r.label} (opens in new tab)`}
                >
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── New post form ── */}
      <section
        aria-labelledby="new-post-heading"
        className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex flex-col gap-2"
      >
        <h3 className="font-semibold text-sm" id="new-post-heading">
          New Post — {activeBoard}
        </h3>

        {/* Error / success announcements */}
        <div aria-live="assertive" aria-atomic="true">
          {error && (
            <div
              role="alert"
              id={errorId}
              className="text-red-700 text-sm bg-red-50 border border-red-200 rounded p-2"
            >
              {error}
            </div>
          )}
          {successMsg && (
            <div
              role="status"
              id={successId}
              className="text-green-700 text-sm bg-green-50 border border-green-200 rounded p-2"
            >
              {successMsg}
            </div>
          )}
        </div>

        {/* Post content */}
        <label htmlFor={postContentId} className="text-xs font-medium text-gray-700">
          Post content <span aria-hidden="true">*</span>
          <span className="sr-only">(required)</span>
        </label>
        <textarea
          id={postContentId}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Share your experience…"
          rows={3}
          className="rounded border border-gray-300 px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-required="true"
          aria-describedby={error ? errorId : undefined}
        />

        {/* Attachment section */}
        <fieldset className="border border-gray-200 rounded p-2 flex flex-col gap-2">
          <legend className="text-xs font-medium text-gray-700 px-1">
            Attachment (optional)
          </legend>

          {/* Attachment type selector */}
          <label htmlFor={attachTypeId} className="text-xs text-gray-600">
            Type
          </label>
          <select
            id={attachTypeId}
            value={attachment.type}
            onChange={(e) =>
              setAttachment((prev) => ({
                ...prev,
                type: e.target.value as 'image' | 'audio' | 'video',
                altText: '',
                captionUrl: '',
              }))
            }
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Attachment type"
          >
            <option value="image">Image</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
          </select>

          {/* Attachment URL */}
          <label htmlFor={attachUrlId} className="text-xs text-gray-600">
            URL
          </label>
          <input
            id={attachUrlId}
            type="url"
            value={attachment.url}
            onChange={(e) => setAttachment((prev) => ({ ...prev, url: e.target.value }))}
            placeholder={`${attachment.type.charAt(0).toUpperCase() + attachment.type.slice(1)} URL`}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`${attachment.type} URL`}
          />

          {/* Alt text — required for images */}
          {attachment.type === 'image' && (
            <>
              <label htmlFor={attachAltId} className="text-xs text-gray-600">
                Alt text{attachment.url && (
                  <>
                    {' '}
                    <span aria-hidden="true">*</span>
                    <span className="sr-only">(required when image URL is provided)</span>
                  </>
                )}
              </label>
              <input
                id={attachAltId}
                type="text"
                value={attachment.altText}
                onChange={(e) => setAttachment((prev) => ({ ...prev, altText: e.target.value }))}
                placeholder="Describe the image for screen reader users (required)"
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Image alt text"
                aria-required={attachment.url ? 'true' : 'false'}
              />
            </>
          )}

          {/* Caption URL — required for audio/video */}
          {(attachment.type === 'audio' || attachment.type === 'video') && (
            <>
              <label htmlFor={attachCaptionId} className="text-xs text-gray-600">
                Captions file URL (SRT or VTT){attachment.url && (
                  <>
                    {' '}
                    <span aria-hidden="true">*</span>
                    <span className="sr-only">(required when audio/video URL is provided)</span>
                  </>
                )}
              </label>
              <input
                id={attachCaptionId}
                type="url"
                value={attachment.captionUrl}
                onChange={(e) => setAttachment((prev) => ({ ...prev, captionUrl: e.target.value }))}
                placeholder="https://example.com/captions.vtt (required)"
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Captions file URL"
                aria-required={attachment.url ? 'true' : 'false'}
              />
            </>
          )}
        </fieldset>

        <button
          onClick={submitPost}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 self-start focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={`Submit post to ${activeBoard} board`}
        >
          Post
        </button>
      </section>

      {/* ── Posts list ── */}
      <section aria-labelledby="posts-heading" aria-live="polite" aria-atomic="false">
        <h3 className="sr-only" id="posts-heading">Forum posts</h3>
        {topLevelPosts.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4" role="status">
            No posts yet. Be the first to share!
          </p>
        )}
        {topLevelPosts.map((post) => {
          const replies = getReplies(post.id)
          const replyInputId = `${uid}-reply-${post.id}`
          const replyErrId = `${uid}-reply-err-${post.id}`
          const postDate = new Date(post.createdAt).toLocaleString()

          return (
            <article
              key={post.id}
              aria-label={`Post by ${post.authorId}, posted ${postDate}`}
              className="rounded-lg border border-gray-200 bg-white p-3 flex flex-col gap-2 mb-3"
            >
              <p className="text-sm text-gray-900">{post.content}</p>
              <p className="text-xs text-gray-400" aria-label={`Posted on ${postDate}`}>
                {postDate}
              </p>

              {/* Image attachments */}
              {post.attachments
                .filter((a) => a.type === 'image')
                .map((att, i) => (
                  <img
                    key={i}
                    src={att.url}
                    alt={att.altText ?? 'Image — no description provided'}
                    className="rounded max-h-48 object-cover"
                    loading="lazy"
                  />
                ))}

              {/* Audio attachments */}
              {post.attachments
                .filter((a) => a.type === 'audio')
                .map((att, i) => (
                  <figure key={i} aria-label="Audio attachment">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio
                      controls
                      aria-label="Audio attachment"
                      className="w-full"
                    >
                      <source src={att.url} />
                      {att.captionUrl && (
                        <track
                          kind="captions"
                          src={att.captionUrl}
                          label="Captions"
                          default
                        />
                      )}
                      Your browser does not support the audio element.
                    </audio>
                  </figure>
                ))}

              {/* Video attachments */}
              {post.attachments
                .filter((a) => a.type === 'video')
                .map((att, i) => (
                  <figure key={i} aria-label="Video attachment">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      controls
                      aria-label="Video attachment"
                      className="w-full rounded max-h-64"
                    >
                      <source src={att.url} />
                      {att.captionUrl && (
                        <track
                          kind="captions"
                          src={att.captionUrl}
                          label="Captions"
                          default
                        />
                      )}
                      Your browser does not support the video element.
                    </video>
                  </figure>
                ))}

              {/* Reactions */}
              <div
                role="group"
                aria-label={`Reactions for post by ${post.authorId}`}
                className="flex gap-2 flex-wrap items-center"
              >
                {REACTIONS.map((emoji) => {
                  const count = (post.reactions[emoji] ?? []).length
                  const reacted = (post.reactions[emoji] ?? []).includes(userId)
                  return (
                    <button
                      key={emoji}
                      onClick={() => addReaction(post.id, emoji)}
                      aria-label={`${reacted ? 'Remove' : 'Add'} ${emoji} reaction${count > 0 ? `, ${count} reaction${count !== 1 ? 's' : ''}` : ''}`}
                      aria-pressed={reacted}
                      className={`rounded-full border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        reacted
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {emoji}
                      {count > 0 && (
                        <span className="ml-1" aria-hidden="true">
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}

                {/* Flag button */}
                <button
                  onClick={() => flagPost(post.id)}
                  aria-label={`Flag post as inappropriate (${post.flaggedBy.length} flag${post.flaggedBy.length !== 1 ? 's' : ''} so far)${post.flaggedBy.includes(userId) ? ', you have already flagged this post' : ''}`}
                  aria-pressed={post.flaggedBy.includes(userId)}
                  disabled={post.flaggedBy.includes(userId)}
                  className="rounded-full border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 ml-auto focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span aria-hidden="true">🚩</span> Flag
                  <span className="ml-1" aria-hidden="true">
                    ({post.flaggedBy.length})
                  </span>
                </button>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <section
                  aria-label={`${replies.length} repl${replies.length !== 1 ? 'ies' : 'y'}`}
                  className="ml-4 border-l-2 border-gray-100 pl-3 flex flex-col gap-2"
                >
                  {replies.map((reply) => (
                    <article
                      key={reply.id}
                      aria-label={`Reply by ${reply.authorId}`}
                      className="text-xs text-gray-700 bg-gray-50 rounded p-2"
                    >
                      {reply.content}
                    </article>
                  ))}
                </section>
              )}

              {/* Reply form */}
              <div className="flex flex-col gap-1">
                {replyErrors[post.id] && (
                  <div
                    role="alert"
                    id={replyErrId}
                    className="text-red-700 text-xs bg-red-50 border border-red-200 rounded p-1"
                  >
                    {replyErrors[post.id]}
                  </div>
                )}
                <div className="flex gap-2">
                  <label htmlFor={replyInputId} className="sr-only">
                    Write a reply to post by {post.authorId}
                  </label>
                  <input
                    id={replyInputId}
                    type="text"
                    value={replyContent[post.id] ?? ''}
                    onChange={(e) =>
                      setReplyContent((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        submitReply(post.id)
                      }
                    }}
                    placeholder="Write a reply…"
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Reply to post by ${post.authorId}`}
                    aria-describedby={replyErrors[post.id] ? replyErrId : undefined}
                  />
                  <button
                    onClick={() => submitReply(post.id)}
                    className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Submit reply to post by ${post.authorId}`}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default CommunityForum
