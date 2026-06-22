import React from 'react'

export default function ActivityBar({ sidebarOpen, chatOpen, onToggleSidebar, onToggleChat, onOpenFolder, onSettings }) {
  return (
    <div className="activity-bar">
      <AbBtn onClick={onToggleSidebar} active={sidebarOpen} title="Explorer">
        <FilesIcon />
      </AbBtn>

      <AbBtn onClick={onOpenFolder} title="Open Folder">
        <FolderIcon />
      </AbBtn>

      <div className="activity-bar-bottom">
        <AbBtn onClick={onToggleChat} active={chatOpen} title="AI Chat">
          <ChatIcon />
        </AbBtn>
        <AbBtn onClick={onSettings} title="Settings / API Key">
          <GearIcon />
        </AbBtn>
      </div>
    </div>
  )
}

function AbBtn({ onClick, active, title, children }) {
  return (
    <button className={`ab-btn ${active ? 'on' : ''}`} onClick={onClick} title={title}>
      {children}
    </button>
  )
}

function FilesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="3" width="9" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7 7h5M7 10h5M7 13h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <rect x="7" y="1" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2.5 6a1.5 1.5 0 011.5-1.5H8l2 2.5h6a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0116 16H4a1.5 1.5 0 01-1.5-1.5V6z" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2C6.13 2 3 4.9 3 8.5c0 1.76.73 3.35 1.9 4.5L4 17l4-1.5c.64.18 1.3.2 2 .2 3.87 0 7-2.9 7-6.5S13.87 2 10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="7" cy="8.5" r=".9" fill="currentColor"/>
      <circle cx="10" cy="8.5" r=".9" fill="currentColor"/>
      <circle cx="13" cy="8.5" r=".9" fill="currentColor"/>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.1 4.1l1.4 1.4M14.5 14.5l1.4 1.4M4.1 15.9l1.4-1.4M14.5 5.5l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
