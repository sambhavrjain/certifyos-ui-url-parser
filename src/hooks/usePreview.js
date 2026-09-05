import { useState, useEffect } from 'react'
import { normalizeUrl } from '../utils/normalizeUrl'
import { fetchPreview } from '../services/fetchPreview'

// Module-level cache so re-renders, re-adds, and scroll don't refetch.
const cache = new Map()

/**
 * Fetch and cache link-preview metadata for a raw URL string.
 *
 * @param {string} rawUrl  Value from the store (may lack a scheme).
 * @returns {{ status: 'loading' | 'ready' | 'unavailable',
 *             data: object | null,
 *             href: string, hostname: string }}
 */
export function usePreview(rawUrl) {
  const { href, hostname } = normalizeUrl(rawUrl)
  const [state, setState] = useState(() => {
    const cached = cache.get(href)
    if (cached) return cached
    return { status: 'loading', data: null }
  })

  useEffect(() => {
    if (!href) return
    if (cache.has(href)) {
      setState(cache.get(href))
      return
    }

    const controller = new AbortController()
    let ignore = false

    fetchPreview(href, { signal: controller.signal })
      .then((data) => {
        if (ignore) return
        const result = { status: 'ready', data }
        cache.set(href, result)
        setState(result)
      })
      .catch((err) => {
        if (ignore) return
        if (err.name === 'AbortError') return
        const result = { status: 'unavailable', data: null }
        cache.set(href, result)
        setState(result)
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [href])

  return { ...state, href, hostname }
}
