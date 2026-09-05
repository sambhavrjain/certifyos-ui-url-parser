import { useState } from 'react'
import { usePreview } from '../hooks/usePreview'

export default function LinkPreviewCard({ url }) {
  const { status, data, href, hostname } = usePreview(url)
  const [imgError, setImgError] = useState(false)

  // -- Loading skeleton ---------------------------------------------------
  if (status === 'loading') {
    return (
      <a
        className="link-preview link-preview--loading"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="link-preview__skeleton-image" />
        <div className="link-preview__body">
          <div className="link-preview__skeleton-line" style={{ width: '70%' }} />
          <div className="link-preview__skeleton-line" style={{ width: '90%' }} />
          <div className="link-preview__skeleton-line" style={{ width: '40%' }} />
        </div>
      </a>
    )
  }

  // -- Unavailable fallback -----------------------------------------------
  if (status === 'unavailable' || !data) {
    return (
      <a
        className="link-preview link-preview--fallback"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          className="link-preview__favicon"
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
          alt=""
          width={16}
          height={16}
        />
        <span className="link-preview__url">{url}</span>
      </a>
    )
  }

  // -- Rich card ----------------------------------------------------------
  const showImage = data.image && !imgError

  return (
    <a
      className="link-preview"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {showImage && (
        <img
          className="link-preview__image"
          src={data.image}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      )}
      <div className="link-preview__body">
        {data.title && (
          <div className="link-preview__title">{data.title}</div>
        )}
        {data.description && (
          <div className="link-preview__description">{data.description}</div>
        )}
        <div className="link-preview__meta">
          {data.favicon && (
            <img
              className="link-preview__favicon"
              src={data.favicon}
              alt=""
              width={14}
              height={14}
            />
          )}
          <span className="link-preview__hostname">{hostname}</span>
        </div>
      </div>
    </a>
  )
}
