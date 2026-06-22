const { contextBridge, ipcRenderer } = require('electron')

const on = (channel, cb) => {
  const handler = (_, data) => cb(data)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('koda', {
  // Window
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close:    () => ipcRenderer.send('window:close'),

  // File system
  openFolder: ()           => ipcRenderer.invoke('fs:openFolder'),
  listDir:    p            => ipcRenderer.invoke('fs:listDir', p),
  readFile:   p            => ipcRenderer.invoke('fs:readFile', p),
  writeFile:  (p, content) => ipcRenderer.invoke('fs:writeFile', p, content),
  pathSep:    ()           => ipcRenderer.invoke('fs:pathSep'),

  // AI streaming
  chatRequest: payload => ipcRenderer.send('ai:chat', payload),
  onChunk:  cb => on('ai:chunk', cb),
  onDone:   cb => on('ai:done',  cb),
  onError:  cb => on('ai:error', cb)
})
