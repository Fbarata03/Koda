import React, { useState } from 'react'

export default function APIKeyModal({ currentKey, onSave, onClose }) {
  const [key, setKey] = useState(currentKey || '')

  const handleSave = () => {
    if (key.trim()) onSave(key.trim())
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal">
        <h2>🔑 Google Gemini API Key</h2>
        <p>
          Koda uses Gemini (gemini-2.0-flash) to power the AI chat. Enter your Google AI API key below.
          It is stored locally in your browser and never sent to any server other than Google.
          <br /><br />
          Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>
        </p>

        <div className="modal-field">
          <label className="modal-label">API KEY</label>
          <input
            className="modal-input"
            type="password"
            placeholder="AIza..."
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>

        <div className="modal-actions">
          {onClose && currentKey && (
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={!key.trim()}>
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
