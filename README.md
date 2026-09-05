# URL Chat

A small React + Vite app that collects URLs in a chat-style feed and renders a
rich **link-preview card** for each one — title, description, image, and favicon
scraped from the target page's Open Graph / `<meta>` tags.

You type a URL, hit **Enter**, and it appears as a bubble in the conversation
with a live preview (with graceful loading and fallback states). URLs are held
in memory only, so a page refresh clears the feed.

---

## Features

- **Chat-style feed** — entries render as timestamped bubbles, newest scrolled
  into view automatically. Remove one with `×`, or clear all from the header.
- **Two-layer URL validation** — a business rule (must start with `www.` or
  `https://`) plus exhaustive structural checks via [`validator`](https://github.com/validatorjs/validator.js).
  The same `validateUrl` is shared by the input field and the store so both
  enforce identical rules.
- **Rich link previews** — a dev-server endpoint fetches the target page,
  extracts OG/meta tags, and returns `{ title, description, image, favicon,
  siteName, hostname }`. The card shows a skeleton while loading and a compact
  favicon + URL fallback when a preview can't be built.
- **SSRF-guarded preview endpoint** — rejects non-`http(s)` schemes and hosts
  that resolve to private / loopback / link-local ranges, with an 8s fetch
  timeout and a 1 MB response cap.
- **Resilient client fetching** — preview requests are capped at 3 concurrent,
  automatically retry on HTTP 429 with exponential back-off (honoring
  `Retry-After`), are cancelled via `AbortSignal` on unmount, and are cached in
  memory so re-renders and re-adds don't refetch.

---

## Tech stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| UI                 | React 18                                           |
| Build / dev server | Vite 6                                             |
| URL validation     | `validator`                                        |
| HTML/OG parsing    | `node-html-parser` (server-side, in the Vite plugin) |
| State              | Plain module singleton + `useSyncExternalStore`    |

No external state library — the store is a hand-rolled observable module.

---

## Getting started

Requires Node.js 18+.

```bash
npm install     # install dependencies
npm run dev     # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build   # production build to dist/
npm run preview # serve the built bundle
```

> **Note:** the link-preview API is a **Vite dev-server middleware**
> (`configureServer` in `vite.config.js`), so it is only available under
> `npm run dev`. A production build has no `/api/preview` endpoint — previews
> would fall back to the favicon+URL card until the endpoint is reimplemented as
> a real backend (serverless function, Express route, etc.). The client
> (`fetchPreview`) is written against a stable HTTP contract so that move
> requires no changes on the front end.

---

## Project structure

```
index.html                     # Vite entry
vite.config.js                 # React plugin + the /api/preview middleware (SSRF guard, OG extraction)
src/
  main.jsx                     # React root
  App.jsx                      # layout: header, feed, input
  components/
    UrlInput.jsx               # validated input + submit
    UrlList.jsx                # chat feed, auto-scroll, remove
    LinkPreviewCard.jsx        # loading / fallback / rich card states
  hooks/
    useUrls.js                 # subscribe to the URL store
    usePreview.js              # fetch + cache preview metadata per URL
  services/
    fetchPreview.js            # client API caller: concurrency limit + retry/back-off
  store/
    urlStore.js                # in-memory URL store (add/remove/clear)
  utils/
    validateUrl.js             # shared validation rule
    normalizeUrl.js            # add scheme, derive hostname
```

---

## How it works

**Adding a URL.** `UrlInput` validates on every keystroke (disabling the button
and showing an inline error once you've typed). On submit it calls
`urlStore.add(url)`, which re-validates and returns an HTTP-style result —
`{ status: 201, data }` on success or `{ status: 400, error }` on rejection —
mimicking a backend `POST` contract. Valid entries get a `crypto.randomUUID()`
id and a timestamp.

**The store.** `urlStore` is a module singleton kept deliberately outside React:
a plain array plus a `Set` of listeners. Components subscribe through
`useUrls()` (backed by `useSyncExternalStore`). Because data lives in one file,
swapping in `localStorage` or a real API later touches only `urlStore.js`.

**Rendering previews.** Each `LinkPreviewCard` calls `usePreview(url)`, which
normalizes the raw value to an `https://` href, checks a module-level cache, and
otherwise calls `fetchPreview`. `fetchPreview` waits for a concurrency slot,
hits `/api/preview?url=…`, and retries on rate-limit. The Vite middleware
fetches the page server-side (avoiding browser CORS), parses it with
`node-html-parser`, and returns the preview metadata.

---

## Validation rules

`validateUrl` accepts a URL only if it **starts with `www.` or `https://`** and
passes `validator.isURL` (valid host, TLD, port, characters, etc.).

| Input                              | Result    |
| ---------------------------------- | --------- |
| `www.google.com`                   | ✅ valid   |
| `https://google.com`               | ✅ valid   |
| `https://google.com:8080/path?q=1` | ✅ valid   |
| `google.com`                       | ❌ (no required prefix) |
| `http://google.com`                | ❌ (http not allowed)   |
| `www.` / `https://`                | ❌ (no host) |
| `https://exa mple.com`             | ❌ (invalid)  |

---

## Limitations & possible next steps

- **No persistence** — the feed is in-memory and clears on refresh (by design;
  `urlStore.js` is the single place to add storage).
- **Preview endpoint is dev-only** — see the note above; needs a real backend
  for production.
- **No tests / linting** configured.
- Previews are best-effort: pages without OG/meta tags, or that block scraping,
  fall back to the favicon + URL card.
