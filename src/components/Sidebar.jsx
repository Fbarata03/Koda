import React, { useState, useEffect, useCallback } from 'react'

// Color per file extension — makes the tree feel alive
const EXT_COLOR = {
  js:'#f7df1e', jsx:'#61dafb', mjs:'#f7df1e', cjs:'#f7df1e',
  ts:'#3178c6', tsx:'#61dafb',
  py:'#3572a5', rb:'#cc342d', go:'#00add8', rs:'#dea584',
  java:'#ed8b00', cs:'#178600', php:'#777bb4', swift:'#f05138', kt:'#7f52ff',
  html:'#e34c26', css:'#563d7c', scss:'#c6538c', less:'#1d365d',
  json:'#80bd01', yaml:'#e34c26', yml:'#e34c26', toml:'#9c4221',
  md:'#aaddff', mdx:'#aaddff', txt:'#8b949e',
  sh:'#89e051', bash:'#89e051', zsh:'#89e051', ps1:'#012456',
  sql:'#e38c00', graphql:'#e10098',
  vue:'#4fc08d', svelte:'#ff3e00',
  png:'#ff8800', jpg:'#ff8800', svg:'#ff8800', gif:'#ff8800',
}

function fileColor(ext) {
  return EXT_COLOR[ext?.toLowerCase()] || '#8b949e'
}

function ChevronIcon({ open }) {
  return (
    <svg className="tree-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d={open ? 'M3 4.5L6 7.5L9 4.5' : 'M4.5 3L7.5 6L4.5 9'}
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function FolderIcon({ open }) {
  return (
    <svg className="tree-dir-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
      {open ? (
        <path d="M1 4.5A1 1 0 012 3.5H5.5l1.5 2h5a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V4.5z" fill="#e8ae6c" opacity=".85"/>
      ) : (
        <path d="M1 4.5A1 1 0 012 3.5H5.5l1.5 2h5a1 1 0 011 1v4a1 1 0 01-1 1H2a1 1 0 01-1-1V4.5z" stroke="#e8ae6c" strokeWidth="1.2" fill="none"/>
      )}
    </svg>
  )
}

function TreeNode({ entry, depth, activeFilePath, onFileClick, onToggleDir, expandedDirs, dirCache }) {
  const isExpanded = expandedDirs.has(entry.path)
  const children   = dirCache.get(entry.path)
  const isActive   = entry.path === activeFilePath

  return (
    <div>
      <div
        className={`tree-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => entry.isDirectory ? onToggleDir(entry.path) : onFileClick(entry.path)}
        title={entry.path}
      >
        {entry.isDirectory ? (
          <>
            <ChevronIcon open={isExpanded} />
            <FolderIcon open={isExpanded} />
          </>
        ) : (
          <>
            <span style={{ width: 12 }} />
            <span className="tree-dot" style={{ background: fileColor(entry.ext) }} />
          </>
        )}
        <span className="tree-name">{entry.name}</span>
      </div>

      {entry.isDirectory && isExpanded && children && (
        <div>
          {children.map(child => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              onFileClick={onFileClick}
              onToggleDir={onToggleDir}
              expandedDirs={expandedDirs}
              dirCache={dirCache}
            />
          ))}
          {children.length === 0 && (
            <div
              className="tree-item"
              style={{ paddingLeft: 8 + (depth + 1) * 16, color: 'var(--txt-2)', fontStyle: 'italic', fontSize: 11 }}
            >
              empty
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ folderPath, activeFilePath, onOpenFolder, onFileClick }) {
  const [expandedDirs, setExpandedDirs] = useState(new Set())
  const [dirCache,     setDirCache]     = useState(new Map())
  const [rootEntries,  setRootEntries]  = useState([])
  const [loading,      setLoading]      = useState(false)

  const loadDir = useCallback(async dirPath => {
    const entries = await window.koda?.listDir(dirPath) ?? []
    setDirCache(prev => new Map(prev).set(dirPath, entries))
    return entries
  }, [])

  useEffect(() => {
    if (!folderPath) return
    setLoading(true)
    setExpandedDirs(new Set())
    setDirCache(new Map())
    loadDir(folderPath)
      .then(setRootEntries)
      .finally(() => setLoading(false))
  }, [folderPath, loadDir])

  const handleToggleDir = useCallback(async dirPath => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(dirPath)) {
        next.delete(dirPath)
      } else {
        next.add(dirPath)
        loadDir(dirPath)
      }
      return next
    })
  }, [loadDir])

  const folderName = folderPath?.split(/[\\/]/).pop()

  return (
    <div className="sidebar">
      <div className="sidebar-head">
        {folderName || 'Explorer'}
      </div>

      <div className="sidebar-tree">
        {!folderPath && (
          <div className="sidebar-empty">
            <button className="btn-open-folder" onClick={onOpenFolder}>Open Folder</button>
            <p>Open a folder to explore files</p>
          </div>
        )}

        {loading && (
          <div style={{ padding: '12px 16px', color: 'var(--txt-2)', fontSize: 12 }}>Loading…</div>
        )}

        {!loading && rootEntries.map(entry => (
          <TreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            activeFilePath={activeFilePath}
            onFileClick={onFileClick}
            onToggleDir={handleToggleDir}
            expandedDirs={expandedDirs}
            dirCache={dirCache}
          />
        ))}
      </div>
    </div>
  )
}
