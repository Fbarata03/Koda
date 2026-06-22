import React from 'react'

export default function TitleBar({ folderPath, chatOpen, onToggleChat, onOpenFolder, onSettings }) {
  const name = folderPath?.split(/[\\/]/).pop()

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <div className="tb-logo">
          <Logo />
          <span className="tb-logo-text">Koda</span>
        </div>
        {name && <span className="tb-folder">{name}</span>}
      </div>

      <div className="titlebar-space" />

      <div className="titlebar-right">
        <button className={`tb-btn ${chatOpen ? 'on' : ''}`} onClick={onToggleChat} title="Toggle AI Chat (Ctrl+U)">
          <ChatIcon />
        </button>
        <button className="tb-btn" onClick={onOpenFolder} title="Open Folder">
          <FolderIcon />
        </button>
        <button className="tb-btn" onClick={onSettings} title="Settings / API Key">
          <GearIcon />
        </button>
        <div className="win-btns">
          <button className="win-btn" onClick={() => window.koda?.minimize()} title="Minimize">─</button>
          <button className="win-btn" onClick={() => window.koda?.maximize()} title="Maximize / Restore">□</button>
          <button className="win-btn x" onClick={() => window.koda?.close()} title="Close">✕</button>
        </div>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="5" fill="#58a6ff"/>
      <path d="M5 5L9.5 10L5 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.5 13.5H15.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M11.5 10H14.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5C4.46 1.5 2 3.74 2 6.5c0 1.36.57 2.6 1.5 3.5L2.5 13l3-1.2c.62.2 1.3.2 2 .2 3.04 0 5.5-2.24 5.5-5S10.54 1.5 7.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <circle cx="5.25" cy="6.5" r=".7" fill="currentColor"/>
      <circle cx="7.5" cy="6.5" r=".7" fill="currentColor"/>
      <circle cx="9.75" cy="6.5" r=".7" fill="currentColor"/>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 4a1 1 0 011-1H6l1.5 2H13a1 1 0 011 1v5a1 1 0 01-1 1H2.5a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.2 3.2l.7.7M11.1 11.1l.7.7M3.2 11.8l.7-.7M11.1 3.9l.7-.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}
