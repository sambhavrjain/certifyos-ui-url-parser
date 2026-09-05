// Turn a stored URL value (which may lack a scheme, e.g. "www.google.com") into
// a fully-qualified https:// href and its hostname.  Used by the preview
// subsystem for both the clickable link and the server request.

const HTTPS = 'https://'

export function normalizeUrl(raw) {
  const url = (raw ?? '').trim()
  if (!url) return { href: '', hostname: '' }

  const href = url.toLowerCase().startsWith('http') ? url : HTTPS + url

  try {
    const { hostname } = new URL(href)
    return { href, hostname }
  } catch {
    // If it still isn't parseable, return what we have — the link will simply
    // open the raw value, which is fine for the fallback card.
    return { href, hostname: url }
  }
}
