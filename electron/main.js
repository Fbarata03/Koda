const _electron = require('electron')
process.stderr.write('DEBUG electron type: ' + typeof _electron + '\n')
process.stderr.write('DEBUG electron keys: ' + JSON.stringify(Object.keys(_electron || {})) + '\n')
const _api = (_electron && _electron.app) ? _electron : (_electron && _electron.default) ? _electron.default : _electron
const { app, BrowserWindow, ipcMain, dialog } = _api
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
    show: true,
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

  mainWindow.webContents.openDevTools()
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

// ── Gemini AI (streaming) ────────────────────────────────────────────────────
ipcMain.on('ai:chat', async (event, { messages, apiKey, system, requestId }) => {
  let GoogleGenerativeAI
  try {
    GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI
  } catch {
    event.sender.send('ai:error', { requestId, error: 'Google AI SDK not installed. Run: npm install' })
    return
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: system,
  })

  // Gemini uses 'model' instead of 'assistant', and wraps text in parts
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))
  const lastMessage = messages[messages.length - 1]

  try {
    const chat = model.startChat({ history })
    const result = await chat.sendMessageStream(lastMessage.content)

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text && !event.sender.isDestroyed()) {
        event.sender.send('ai:chunk', { requestId, text })
      }
    }

    const response = await result.response
    const usage = response.usageMetadata
    if (!event.sender.isDestroyed()) {
      event.sender.send('ai:done', {
        requestId,
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0
      })
    }
  } catch (err) {
    if (!event.sender.isDestroyed()) event.sender.send('ai:error', { requestId, error: err.message })
  }
})
