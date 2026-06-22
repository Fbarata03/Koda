import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const SYSTEM = `You are Koda AI, an expert programming assistant embedded in the Koda IDE. You help developers write, understand, debug, and improve code.

Guidelines:
- Be concise yet thorough. Lead with the answer, follow with explanation.
- Always use fenced code blocks with a language tag (e.g. \`\`\`typescript).
- When the user shares a file, use it as full context for your answer.
- If you propose changes, show only the relevant diff/snippet, not the whole file (unless short).
- Never guess imports or APIs — if unsure, say so.`

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className={`code-block-copy ${copied ? 'copied' : ''}`} onClick={copy}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function CodeBlock({ language, children }) {
  const code = String(children).replace(/\n$/, '')
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <CopyButton text={code} />
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, fontSize: 12, lineHeight: 1.6 }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      className="msg-body"
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          if (!inline && match) {
            return <CodeBlock language={match[1]}>{children}</CodeBlock>
          }
          return <code className={className} {...props}>{children}</code>
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function Message({ msg }) {
  return (
    <div className={`msg ${msg.role} ${msg.isError ? 'error' : ''}`}>
      <div className="msg-role">{msg.role === 'user' ? 'You' : 'Koda AI'}</div>
      {msg.role === 'user' ? (
        <div className="msg-body">{msg.displayContent}</div>
      ) : (
        <MarkdownMessage content={msg.content} />
      )}
    </div>
  )
}

function StreamingMessage({ text }) {
  return (
    <div className="msg assistant">
      <div className="msg-role">Koda AI</div>
      <MarkdownMessage content={text} />
      <span className="streaming-cursor" />
    </div>
  )
}

export default function AIChat({ apiKey, activeFile, onNeedKey }) {
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [streaming,    setStreaming]     = useState(false)
  const [streamText,   setStreamText]   = useState('')
  const [includeFile,  setIncludeFile]  = useState(true)
  const [lastTokens,   setLastTokens]   = useState(null)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const cleanupRef  = useRef([])

  // Auto-scroll when new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    if (!apiKey) { onNeedKey(); return }

    // Build context-aware content for the API (includes file if toggled)
    let apiContent = text
    if (includeFile && activeFile?.content) {
      const filename = activeFile.path.split(/[\\/]/).pop()
      apiContent = `${text}\n\n<file name="${filename}" language="${activeFile.language}">\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\`\n</file>`
    }

    const userMsg = { role: 'user', content: apiContent, displayContent: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setStreaming(true)
    setStreamText('')

    // Clean up any previous listeners
    cleanupRef.current.forEach(fn => fn())
    cleanupRef.current = []

    let accumulated = ''

    const r1 = window.koda.onChunk(({ text: chunk }) => {
      accumulated += chunk
      setStreamText(accumulated)
    })

    const r2 = window.koda.onDone(({ inputTokens, outputTokens }) => {
      setMessages(prev => [...prev, { role: 'assistant', content: accumulated }])
      setStreamText('')
      setStreaming(false)
      setLastTokens({ in: inputTokens, out: outputTokens })
      cleanup()
    })

    const r3 = window.koda.onError(({ error }) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${error}`,
        isError: true
      }])
      setStreaming(false)
      setStreamText('')
      cleanup()
    })

    function cleanup() {
      r1(); r2(); r3()
      cleanupRef.current = []
    }
    cleanupRef.current = [r1, r2, r3]

    window.koda.chatRequest({
      messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
      apiKey,
      system: SYSTEM,
      requestId: Date.now().toString()
    })
  }, [input, streaming, apiKey, messages, includeFile, activeFile, onNeedKey])

  const handleKeyDown = useCallback(e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const clearChat = useCallback(() => {
    setMessages([])
    setStreamText('')
    setStreaming(false)
    setLastTokens(null)
  }, [])

  const hasContent = messages.length > 0 || streaming

  return (
    <div className="chat">
      {/* Header */}
      <div className="chat-head">
        <div className="chat-title">
          <AiSparkle />
          Koda AI
        </div>
        <div className="chat-head-actions">
          {hasContent && (
            <button className="chat-icon-btn" onClick={clearChat} title="Clear conversation">
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {!hasContent && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon"><AiSparkle size={32} /></div>
            <h3>Koda AI</h3>
            <p>
              Powered by <strong>Claude claude-sonnet-4-6</strong> — 200K context window.<br />
              Ask questions, get code reviews, debug errors,<br />or explain any file in your project.
            </p>
          </div>
        )}

        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {streaming && <StreamingMessage text={streamText} />}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="chat-footer">
        <div className="chat-context-bar">
          <label className={`ctx-toggle ${includeFile && activeFile ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={includeFile}
              onChange={e => setIncludeFile(e.target.checked)}
            />
            {activeFile
              ? `Include: ${activeFile.path.split(/[\\/]/).pop()}`
              : 'No file open'}
          </label>

          {lastTokens && (
            <span className="chat-tokens" style={{ marginLeft: 'auto' }}>
              {lastTokens.in?.toLocaleString()} in · {lastTokens.out?.toLocaleString()} out
            </span>
          )}
        </div>

        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={streaming ? 'Waiting for response…' : 'Ask Koda AI… (Enter to send, Shift+Enter for newline)'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
            style={{ height: Math.min(120, Math.max(36, input.split('\n').length * 20 + 16)) }}
          />
          <button
            className="chat-send"
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            title="Send (Enter)"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function AiSparkle({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 2l1.8 5.4L17 9l-5.2 1.6L10 16l-1.8-5.4L3 9l5.2-1.6L10 2z" fill="#a78bfa"/>
      <path d="M16 1l.9 2.1L19 4l-2.1.9L16 7l-.9-2.1L13 4l2.1-.9L16 1z" fill="#a78bfa" opacity=".6"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7a1 1 0 001 .9h4.6a1 1 0 001-.9L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M14 8L2 2l3 6-3 6 12-6z" fill="white"/>
    </svg>
  )
}
