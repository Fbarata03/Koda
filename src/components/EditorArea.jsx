import React, { useCallback, useRef } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'

const EXT_COLOR = {
  js:'#f7df1e', jsx:'#61dafb', ts:'#3178c6', tsx:'#61dafb',
  py:'#3572a5', go:'#00add8', rs:'#dea584', rb:'#cc342d',
  html:'#e34c26', css:'#563d7c', json:'#80bd01', md:'#aaddff',
}
function tabColor(path) {
  const ext = path?.split('.').pop()?.toLowerCase()
  return EXT_COLOR[ext] || '#8b949e'
}

function defineKodaTheme(monaco) {
  monaco.editor.defineTheme('koda-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment',          foreground: '6e7681', fontStyle: 'italic' },
      { token: 'keyword',          foreground: 'ff7b72' },
      { token: 'keyword.operator', foreground: 'ff7b72' },
      { token: 'string',           foreground: 'a5d6ff' },
      { token: 'string.escape',    foreground: '79c0ff' },
      { token: 'number',           foreground: '79c0ff' },
      { token: 'regexp',           foreground: 'a5d6ff' },
      { token: 'type',             foreground: 'ffa657' },
      { token: 'class',            foreground: 'ffa657' },
      { token: 'function',         foreground: 'd2a8ff' },
      { token: 'variable',         foreground: 'e6edf3' },
      { token: 'constant',         foreground: '79c0ff' },
      { token: 'tag',              foreground: '7ee787' },
      { token: 'attribute.name',   foreground: 'ffa657' },
      { token: 'attribute.value',  foreground: 'a5d6ff' },
    ],
    colors: {
      'editor.background':                '#0d1117',
      'editor.foreground':                '#e6edf3',
      'editorLineNumber.foreground':      '#30363d',
      'editorLineNumber.activeForeground':'#8b949e',
      'editor.selectionBackground':       '#264f78',
      'editor.lineHighlightBackground':   '#161b22',
      'editorCursor.foreground':          '#58a6ff',
      'editorBracketMatch.background':    '#17363d',
      'editorBracketMatch.border':        '#00000000',
      'editorWidget.background':          '#161b22',
      'editorWidget.border':              '#30363d',
      'editorSuggestWidget.background':   '#1c2128',
      'editorSuggestWidget.border':       '#30363d',
      'editorSuggestWidget.selectedBackground': '#21262d',
      'editorSuggestWidget.highlightForeground': '#58a6ff',
      'editorHoverWidget.background':     '#1c2128',
      'editorHoverWidget.border':         '#30363d',
      'scrollbar.shadow':                 '#00000000',
      'scrollbarSlider.background':       '#30363d66',
      'scrollbarSlider.hoverBackground':  '#30363daa',
      'scrollbarSlider.activeBackground': '#30363dcc',
      'minimap.background':               '#0d1117',
      'input.background':                 '#0d1117',
      'input.border':                     '#30363d',
      'focusBorder':                      '#58a6ff',
    }
  })
}

function EmptyState() {
  return (
    <div className="editor-empty">
      <svg className="editor-empty-logo" width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect width="64" height="64" rx="14" fill="#58a6ff"/>
        <path d="M16 16L30 32L16 48" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M36 40H50" stroke="white" strokeWidth="5" strokeLinecap="round"/>
        <path d="M36 32H48" stroke="white" strokeWidth="5" strokeLinecap="round"/>
      </svg>
      <p>Open a file to start editing</p>
      <p style={{ fontSize: 11, color: 'var(--txt-2)' }}>Ctrl+S to save · Ctrl+U for AI chat</p>
    </div>
  )
}

export default function EditorArea({ openFiles, activeFilePath, pathSep, onTabClick, onTabClose, onContentChange, onSave }) {
  const monacoRef = useRef(null)

  const handleMount = useCallback((editor, monaco) => {
    monacoRef.current = monaco
    defineKodaTheme(monaco)
    monaco.editor.setTheme('koda-dark')

    // Ctrl+S → save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFilePath) onSave(activeFilePath)
    })
  }, [activeFilePath, onSave])

  const handleBeforeMount = useCallback(monaco => {
    defineKodaTheme(monaco)
  }, [])

  const activeFile = openFiles.find(f => f.path === activeFilePath)

  return (
    <div className="editor-area">
      {/* Tabs */}
      {openFiles.length > 0 && (
        <div className="tabs">
          {openFiles.map(file => {
            const name = file.path.split(/[\\/]/).pop()
            const isActive = file.path === activeFilePath
            return (
              <div
                key={file.path}
                className={`tab ${isActive ? 'active' : ''}`}
                onClick={() => onTabClick(file.path)}
                title={file.path}
              >
                <span className="tab-dot" style={{ background: tabColor(file.path) }} />
                <span className="tab-name">{name}</span>
                {file.modified && <span className="tab-modified">●</span>}
                <button
                  className="tab-close"
                  onClick={e => { e.stopPropagation(); onTabClose(file.path) }}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Editor / Empty */}
      {activeFile ? (
        <div className="editor-wrap">
          <Editor
            key={activeFile.path}
            language={activeFile.language}
            value={activeFile.content}
            theme="koda-dark"
            beforeMount={handleBeforeMount}
            onMount={handleMount}
            onChange={value => onContentChange(activeFile.path, value ?? '')}
            options={{
              fontSize: 14,
              fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
              fontLigatures: true,
              lineHeight: 22,
              letterSpacing: 0.3,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              cursorBlinking: 'smooth',
              renderLineHighlight: 'line',
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              padding: { top: 12, bottom: 12 },
              wordWrap: 'off',
              tabSize: 2,
              insertSpaces: true,
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              formatOnPaste: true,
              suggest: { preview: true },
            }}
          />
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
