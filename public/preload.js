const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  queryDatabase: (query, params) => ipcRenderer.invoke('db-query', query, params),
  
  // File operations
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Platform info
  platform: process.platform,
  isElectron: true
});
