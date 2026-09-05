import { useState } from 'react'
import { urlStore } from '../store/urlStore'
import { validateUrl } from '../utils/validateUrl'

export default function UrlInput() {
  const [value, setValue] = useState('')
  const [serverError, setServerError] = useState('')

  const trimmed = value.trim()
  const { valid, error: validationError } = validateUrl(value)

  // Only nag the user once they've actually typed something.
  const showValidationError = trimmed.length > 0 && !valid
  const message = serverError || (showValidationError ? validationError : '')

  function handleChange(event) {
    setValue(event.target.value)
    if (serverError) setServerError('') // clear stale submit error while editing
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!valid) return // button is disabled anyway; guard just in case

    const res = urlStore.add(value)
    if (res.status === 201) {
      setValue('')
      setServerError('')
    } else {
      // Handler rejected it (HTTP 400) — surface the reason.
      setServerError(res.error)
    }
  }

  return (
    <form className="url-input" onSubmit={handleSubmit} noValidate>
      <div className="url-input__row">
        <input
          type="text"
          placeholder="Enter a URL, e.g. www.google.com"
          value={value}
          onChange={handleChange}
          aria-label="URL"
          aria-invalid={showValidationError || !!serverError}
          autoFocus
        />
        <button type="submit" disabled={!valid}>
          Enter
        </button>
      </div>
      {message && (
        <p className="url-input__error" role="alert">
          {message}
        </p>
      )}
    </form>
  )
}
