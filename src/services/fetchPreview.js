// Client-side function that calls our preview endpoint.
// The endpoint is a Vite dev-server middleware today; the same contract works
// as a serverless function or Express route in production — nothing here
// changes when the backend moves.

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000 // 1s → 2s → 4s
const MAX_CONCURRENCY = 3 // at most 3 fetches in flight at once

// ── Concurrency limiter ────────────────────────────────────────────────
// When a user pastes 10 URLs at once, we don't want 10 parallel fetches —
// that invites 429s and saturates the connection.  This tiny queue lets at
// most MAX_CONCURRENCY requests run; the rest wait their turn.  Aborted
// requests release their slot immediately.

let inflight = 0
const waiting = [] // array of { resolve }

function acquireSlot(signal) {
  // Fast path: a slot is free.
  if (inflight < MAX_CONCURRENCY) {
    inflight++
    return Promise.resolve()
  }

  // Slow path: wait until someone releases a slot (or we get aborted).
  return new Promise((resolve, reject) => {
    const entry = { resolve }
    waiting.push(entry)

    signal?.addEventListener('abort', () => {
      // Remove ourselves from the queue so we never occupy a slot.
      const idx = waiting.indexOf(entry)
      if (idx !== -1) waiting.splice(idx, 1)
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

function releaseSlot() {
  // If someone is waiting, hand the slot directly to them (no decrement).
  if (waiting.length > 0) {
    const next = waiting.shift()
    next.resolve()
  } else {
    inflight--
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Sleep for `ms` milliseconds, but bail early if `signal` is aborted.
 */
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Fetch link-preview metadata for a fully-qualified URL.
 *
 * Concurrency is capped at {@link MAX_CONCURRENCY} in-flight requests — extra
 * callers queue transparently.  Each request retries automatically on 429
 * (rate-limited) up to {@link MAX_RETRIES} times with exponential back-off,
 * honouring the server's `Retry-After` header when present.
 *
 * @param {string} href  Absolute URL (https://…)
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]  Cancel an in-flight (or queued) request —
 *   the hook passes this so the fetch is aborted when the component unmounts or
 *   the URL changes before the response arrives (avoids race conditions and
 *   wasted network).
 * @returns {Promise<{ title: string, description: string, image: string,
 *   favicon: string, siteName: string, hostname: string }>}
 */
export async function fetchPreview(href, { signal } = {}) {
  // Wait for a concurrency slot (or get aborted while queued).
  await acquireSlot(signal)

  try {
    return await _fetchWithRetry(href, signal)
  } finally {
    releaseSlot()
  }
}

async function _fetchWithRetry(href, signal) {
  let lastError

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `/api/preview?url=${encodeURIComponent(href)}`,
      { signal },
    )

    // -- Rate-limited: back off and retry --------------------------------
    if (res.status === 429) {
      lastError = new Error('Rate limited')

      if (attempt < MAX_RETRIES) {
        // Prefer the server's Retry-After (seconds) if provided, otherwise
        // use exponential back-off: 1s → 2s → 4s.
        const retryAfter = res.headers.get('Retry-After')
        const delayMs = retryAfter
          ? Number(retryAfter) * 1000
          : BASE_DELAY_MS * 2 ** attempt

        await wait(delayMs, signal)
        continue
      }

      throw lastError
    }

    if (!res.ok) throw new Error(`Preview endpoint returned ${res.status}`)

    const json = await res.json()
    if (!json.ok) throw new Error('Preview unavailable')

    return json.preview
  }

  throw lastError
}
