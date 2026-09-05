import { useEffect, useRef } from 'react'
import { useUrls } from '../hooks/useUrls'
import { urlStore } from '../store/urlStore'
import LinkPreviewCard from './LinkPreviewCard'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UrlList() {
  const urls = useUrls()
  const bottomRef = useRef(null)

  // Keep the newest entry in view, like a chat window.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [urls.length])

  if (urls.length === 0) {
    return (
      <div className="url-list url-list--empty">
        <p>No URLs yet. Type one above and hit Enter.</p>
      </div>
    )
  }

  return (
    <ul className="url-list">
      {urls.map((entry) => (
        <li key={entry.id} className="url-item">
          <div className="url-item__bubble">
            <LinkPreviewCard url={entry.url} />
            <button
              className="url-item__remove"
              onClick={() => urlStore.remove(entry.id)}
              aria-label="Remove URL"
              title="Remove"
            >
              ×
            </button>
          </div>
          <time className="url-item__time">{formatTime(entry.addedAt)}</time>
        </li>
      ))}
      <div ref={bottomRef} />
    </ul>
  )
}
