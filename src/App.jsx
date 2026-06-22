import React, { useState, useCallback, useEffect } from 'react'
import TitleBar from './components/TitleBar.jsx'
import ActivityBar from './components/ActivityBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import EditorArea from './components/EditorArea.jsx'
import AIChat from './components/AIChat.jsx'
import StatusBar from './components/StatusBar.jsx'
import APIKeyModal from './components/APIKeyModal.jsx'

const EXT_LANG = {
  js:'javascript', jsx:'javascript', mjs:'javascript', cjs:'javascript',
  ts:'typescript', tsx:'typescript', mts:'typescript',
  py:'python', rb:'ruby', go:'go', rs:'rust', java:'java',
  c:'c', cpp:'cpp', cc:'cpp', h:'cpp', cs:'csharp', php:'php', kt:'kotlin', swift:'swift',
  html:'html', css:'css', scss:'scss', less:'less',
  json:'json', jsonc:'json', yaml:'yaml', yml:'yaml', toml:'toml',
  md:'markdown', mdx:'markdown',
  sh:'shell', bash:'shell', zsh:'shell', ps1:'powershell',
  sql:'sql', graphql:'graphql', xml:'xml', svg:'xml',
  vue:'html', svelte:'html', astro:'html'
}

export function getLanguage(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  return EXT_LANG[ext] || 'plaintext'
}

export default function App() {
  const [folderPath,    setFolderPath]    = useState(null)
  const [openFiles,     setOpenFiles]     = useState([])  // [{path, content, language, modified}]
  const [activeFile,    setActiveFile]    = useState(null) // path string
  const [chatOpen,      setChatOpen]      = useState(true)
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [apiKey,        setApiKey]        = useState(() => localStorage.getItem('koda_key') || '')
  const [showKeyModal,  setShowKeyModal]  = useState(false)
  const [pathSep,       setPathSep]       = useState('/')
  const [statusMsg,     setStatusMsg]     = useState('Ready')

  useEffect(() => {
    window.koda?.pathSep().then(s => setPathSep(s))
  }, [])

  useEffect(() => {
    if (!apiKey) setShowKeyModal(true)
  }, [apiKey])

  const flash = useCallback(msg => {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg('Ready'), 2500)
  }, [])

  // ── Open folder ─────────────────────────────────────────────────────────
  const openFolder = useCallback(async () => {
    const p = await window.koda?.openFolder()
    if (p) { setFolderPath(p); setOpenFiles([]); setActiveFile(null) }
  }, [])

  // ── Open file in editor ──────────────────────────────────────────────────
  const openFile = useCallback(async filePath => {
    if (openFiles.find(f => f.path === filePath)) {
      setActiveFile(filePath)
      return
    }
    try {
      const content  = await window.koda?.readFile(filePath)
      const name     = filePath.split(/[\\/]/).pop()
      const language = getLanguage(name)
      setOpenFiles(prev => [...prev, { path: filePath, content, language, modified: false }])
      setActiveFile(filePath)
    } catch (e) { flash(`Cannot open file: ${e.message}`) }
  }, [openFiles, flash])

  // ── Close tab ───────────────────────────────────────────────────────────
  const closeFile = useCallback(filePath => {
    setOpenFiles(prev => {
      const idx      = prev.findIndex(f => f.path === filePath)
      const next     = prev.filter(f => f.path !== filePath)
      if (activeFile === filePath) setActiveFile(next[idx]?.path ?? next[idx - 1]?.path ?? null)
      return next
    })
  }, [activeFile])

  // ── Content change (editor) ──────────────────────────────────────────────
  const updateContent = useCallback((filePath, content) => {
    setOpenFiles(prev => prev.map(f => f.path === filePath ? { ...f, content, modified: true } : f))
  }, [])

  // ── Save file ────────────────────────────────────────────────────────────
  const saveFile = useCallback(async filePath => {
    const file = openFiles.find(f => f.path === filePath)
    if (!file) return
    try {
      await window.koda?.writeFile(filePath, file.content)
      setOpenFiles(prev => prev.map(f => f.path === filePath ? { ...f, modified: false } : f))
      flash('Saved')
    } catch (e) { flash(`Save failed: ${e.message}`) }
  }, [openFiles, flash])

  // ── API key ──────────────────────────────────────────────────────────────
  const saveKey = useCallback(key => {
    setApiKey(key)
    localStorage.setItem('koda_key', key)
    setShowKeyModal(false)
  }, [])

  const activeFileObj = openFiles.find(f => f.path === activeFile) ?? null

  return (
    <div className="app">
      <TitleBar
        folderPath={folderPath}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(v => !v)}
        onOpenFolder={openFolder}
        onSettings={() => setShowKeyModal(true)}
      />

      <div className="app-body">
        <ActivityBar
          sidebarOpen={sidebarOpen}
          chatOpen={chatOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          onToggleChat={() => setChatOpen(v => !v)}
          onOpenFolder={openFolder}
          onSettings={() => setShowKeyModal(true)}
        />

        {sidebarOpen && (
          <Sidebar
            folderPath={folderPath}
            activeFilePath={activeFile}
            onOpenFolder={openFolder}
            onFileClick={openFile}
            pathSep={pathSep}
          />
        )}

        <EditorArea
          openFiles={openFiles}
          activeFilePath={activeFile}
          pathSep={pathSep}
          onTabClick={setActiveFile}
          onTabClose={closeFile}
          onContentChange={updateContent}
          onSave={saveFile}
        />

        {chatOpen && (
          <AIChat
            apiKey={apiKey}
            activeFile={activeFileObj}
            onNeedKey={() => setShowKeyModal(true)}
          />
        )}
      </div>

      <StatusBar
        activeFile={activeFileObj}
        pathSep={pathSep}
        statusMsg={statusMsg}
        hasKey={!!apiKey}
        onSettings={() => setShowKeyModal(true)}
      />

      {showKeyModal && (
        <APIKeyModal
          currentKey={apiKey}
          onSave={saveKey}
          onClose={() => apiKey && setShowKeyModal(false)}
        />
      )}
    </div>
  )
}
