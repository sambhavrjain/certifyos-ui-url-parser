import validator from 'validator'

// Single source of truth for URL validation, shared by the UI and the
// store's create handler so both enforce exactly the same rule.
//
// Two layers:
//   1. Business rule  — must start with "www." or "https://".
//   2. Structural     — validator.isURL() handles the exhaustive checks
//                        (valid host, TLD, port, allowed characters, etc.).
//
//   valid   → "www.google.com", "https://www.google.com",
//             "https://google.com", "https://google.com:8080/path?q=1"
//   invalid → "google.com", "http://google.com", "www.", "https://",
//             "www.bad_host", "https://exa mple.com"

const HTTPS_PREFIX = 'https://'

// If a protocol is present it must be https; a bare "www." host is allowed.
const ISURL_OPTIONS = {
  protocols: ['https'],
  require_protocol: false,
  require_valid_protocol: true,
  require_host: true,
  require_tld: true,
  allow_underscores: false,
  allow_fragments: true,
  allow_query_components: true,
}

export function validateUrl(raw) {
  const url = (raw ?? '').trim()

  if (!url) {
    return { valid: false, error: 'Please enter a URL.' }
  }

  const lower = url.toLowerCase()
  const hasWww = lower.startsWith('www.')
  const hasHttps = lower.startsWith(HTTPS_PREFIX)

  // Layer 1: business rule — required prefix.
  if (!hasWww && !hasHttps) {
    return {
      valid: false,
      error: 'URL must start with "www." or "https://" (e.g. www.google.com).',
    }
  }

  // Layer 2: exhaustive structural validation via the library.
  if (!validator.isURL(url, ISURL_OPTIONS)) {
    return {
      valid: false,
      error: 'That doesn’t look like a valid URL. Try e.g. www.google.com.',
    }
  }

  return { valid: true }
}
