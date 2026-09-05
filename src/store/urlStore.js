import { validateUrl } from '../utils/validateUrl'

// In-memory store for entered URLs.
//
// This lives outside React as a plain module singleton, so the "place" where
// URLs are kept is decoupled from any component. Data is held in a JS array in
// memory only — it is NOT persisted, so a page refresh clears it. To persist
// later (localStorage, an API, etc.), only this file needs to change.

let urls = []
const listeners = new Set()

function emit() {
  // Hand out a fresh array reference so useSyncExternalStore detects the change.
  urls = urls.slice()
  listeners.forEach((listener) => listener())
}

export const urlStore = {
  /** Subscribe to changes. Returns an unsubscribe function. */
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  /** Current snapshot of stored URLs (newest last). */
  getSnapshot() {
    return urls
  },

  /**
   * Create-URL handler — our stand-in for a backend POST.
   * Validates the URL and responds with an HTTP-style status code so the UI
   * (and any future real backend) can react to a consistent contract.
   *
   * @returns {{ status: 201, data: Entry } | { status: 400, error: string }}
   */
  add(url) {
    const { valid, error } = validateUrl(url)
    if (!valid) {
      return { status: 400, error }
    }

    const entry = {
      id: crypto.randomUUID(),
      url: url.trim(),
      addedAt: Date.now(),
    }
    urls.push(entry)
    emit()
    return { status: 201, data: entry }
  },

  /** Remove a URL entry by id. */
  remove(id) {
    urls = urls.filter((entry) => entry.id !== id)
    emit()
  },

  /** Clear all stored URLs. */
  clear() {
    urls = []
    emit()
  },
}
