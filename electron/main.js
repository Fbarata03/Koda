const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fsPromises = require('fs').promises

const isDev = process.env.NODE_ENV === 'development'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// ── Window controls ─────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize())
ipcMain.on('window:close',    () => mainWindow?.close())

// ── File system ──────────────────────────────────────────────────────────────
ipcMain.handle('fs:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:listDir', async (_, dirPath) => {
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true })
    return entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(dirPath, e.name),
        isDirectory: e.isDirectory(),
        ext: e.isFile() ? path.extname(e.name).replace('.', '') : null
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch { return [] }
})

ipcMain.handle('fs:readFile',  async (_, p) => fsPromises.readFile(p, 'utf-8'))
ipcMain.handle('fs:writeFile', async (_, p, content) => { await fsPromises.writeFile(p, content, 'utf-8'); return true })
ipcMain.handle('fs:pathSep',   () => path.sep)

// ── Claude AI (streaming) ────────────────────────────────────────────────────
ipcMain.on('ai:chat', async (event, { messages, apiKey, system, requestId }) => {
  let Anthropic
  try {
    Anthropic = require('@anthropic-ai/sdk')
    if (Anthropic.default) Anthropic = Anthropic.default
  } catch {
    event.sender.send('ai:error', { requestId, error: 'Anthropic SDK not installed. Run: npm install' })
    return
  }

  const client = new Anthropic({ apiKey })

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8096,
      system,
      messages
    })

    stream.on('text', text => {
      if (!event.sender.isDestroyed()) event.sender.send('ai:chunk', { requestId, text })
    })

    const final = await stream.finalMessage()
    if (!event.sender.isDestroyed()) {
      event.sender.send('ai:done', {
        requestId,
        inputTokens: final.usage?.input_tokens ?? 0,
        outputTokens: final.usage?.output_tokens ?? 0
      })
    }
  } catch (err) {
    if (!event.sender.isDestroyed()) event.sender.send('ai:error', { requestId, error: err.message })
  }
})
