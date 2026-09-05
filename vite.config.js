import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { parse } from 'node-html-parser'

// ── SSRF guard ─────────────────────────────────────────────────────────
// Reject URLs that resolve to private/loopback/link-local addresses so
// the preview endpoint can't be used to probe internal services.

const PRIVATE_PATTERNS = [
  /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^0\./, /^169\.254\./, /^::1$/, /^fc00:/i, /^fe80:/i, /^fd/i,
]

function isPrivateHost(hostname) {
  const lower = hostname.toLowerCase()
  if (lower === 'localhost') return true
  return PRIVATE_PATTERNS.some((re) => re.test(lower))
}

// ── OG / meta extraction ──────────────────────────────────────────────

function extractPreview(html, url) {
  const root = parse(html)

  const og = (prop) =>
    root.querySelector(`meta[property="og:${prop}"]`)?.getAttribute('content') ?? ''

  const meta = (name) =>
    root.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? ''

  const title =
    og('title') ||
    root.querySelector('title')?.textContent?.trim() ||
    ''

  const description =
    og('description') ||
    meta('description') ||
    ''

  let image = og('image')
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, url).href
    } catch { /* leave as-is */ }
  }

  const siteName = og('site_name')

  let hostname = ''
  try { hostname = new URL(url).hostname } catch { /* */ }

  let favicon = ''
  const iconLink = root.querySelector('link[rel="icon"]')
    ?? root.querySelector('link[rel="shortcut icon"]')
  if (iconLink) {
    favicon = iconLink.getAttribute('href') ?? ''
    if (favicon && !favicon.startsWith('http')) {
      try { favicon = new URL(favicon, url).href } catch { /* */ }
    }
  }
  if (!favicon && hostname) {
    favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  }

  return { title, description, image, favicon, siteName, hostname }
}

// ── Vite plugin ────────────────────────────────────────────────────────

function previewApiPlugin() {
  return {
    name: 'preview-api',
    configureServer(server) {
      server.middlewares.use('/api/preview', async (req, res) => {
        const params = new URL(req.url, 'http://localhost').searchParams
        const targetUrl = params.get('url')

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ ok: false, error: 'Missing ?url=' }))
        }

        let parsed
        try {
          parsed = new URL(targetUrl)
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ ok: false, error: 'Invalid URL' }))
        }

        if (!['http:', 'https:'].includes(parsed.protocol)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ ok: false, error: 'Only http(s) allowed' }))
        }

        if (isPrivateHost(parsed.hostname)) {
          res.writeHead(403, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ ok: false, error: 'Private addresses blocked' }))
        }

        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 8000)

          const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'certifyos-url-chat/0.1 link-preview',
              Accept: 'text/html,*/*',
            },
            redirect: 'follow',
          })

          clearTimeout(timeout)

          const text = await response.text()
          const html = text.slice(0, 1_000_000)

          const preview = extractPreview(html, targetUrl)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true, preview }))
        } catch (err) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: err.message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), previewApiPlugin()],
})
