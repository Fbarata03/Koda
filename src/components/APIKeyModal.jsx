import React, { useState } from 'react'

export default function APIKeyModal({ currentKey, onSave, onClose }) {
  const [key, setKey] = useState(currentKey || '')

  const handleSave = () => {
    if (key.trim()) onSave(key.trim())
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal">
        <h2>🔑 Anthropic API Key</h2>
        <p>
          Koda uses Claude (claude-sonnet-4-6) to power the AI chat. Enter your Anthropic API key below.
          It is stored locally in your browser and never sent to any server other than Anthropic.
          <br /><br />
          Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>
        </p>

        <div className="modal-field">
          <label className="modal-label">API KEY</label>
          <input
            className="modal-input"
            type="password"
            placeholder="sk-ant-..."
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
