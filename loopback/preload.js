const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('meetingAI', {
  listDevices:    ()       => ipcRenderer.invoke('list-devices'),
  startCapture:   (device) => ipcRenderer.send('start-capture', device),
  stopCapture:    ()       => ipcRenderer.send('stop-capture'),
  askClaude:      (args)   => ipcRenderer.invoke('ask-claude', args),
  onTranscript:   (cb)     => ipcRenderer.on('transcript-chunk', (_, text) => cb(text)),
  windowMinimize: ()       => ipcRenderer.send('window-minimize'),
  windowClose:    ()       => ipcRenderer.send('window-close'),
});