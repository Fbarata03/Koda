import React from 'react'

export default function StatusBar({ activeFile, pathSep, statusMsg, hasKey, onSettings }) {
  const filename = activeFile?.path?.split(/[\\/]/).pop()

  return (
    <div className={`status-bar ${!hasKey ? 'no-key' : ''}`}>
      <span className="sb-item">
        <BranchIcon />
        Koda IDE
      </span>

      {!hasKey && (
        <span className="sb-item">
          <WarnIcon />
          <button onClick={onSettings}>No API key — click to add</button>
        </span>
      )}

      <span className="sb-spacer" />

      {statusMsg !== 'Ready' && (
        <span className="sb-item">{statusMsg}</span>
      )}

      {filename && (
        <span className="sb-item">
          <FileIcon />
          {filename}
        </span>
      )}

      {activeFile?.language && (
        <span className="sb-item">{activeFile.language}</span>
      )}
    </div>
  )
}

function BranchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="3" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="9" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="3" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 4.5V9M3 4.5C3 7 9 7 9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1L11 10H1L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M6 5v2.5M6 8.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x="1" y="1" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M3 4h4M3 6.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}
