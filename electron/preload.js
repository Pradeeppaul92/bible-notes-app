const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seferAPI', {
  saveDocx:     (buffer, defaultName) => ipcRenderer.invoke('save-docx', buffer, defaultName),
  storageRead:  ()     => ipcRenderer.invoke('storage-read'),
  storageWrite: (json) => ipcRenderer.invoke('storage-write', json),
  syncStatus:   ()     => ipcRenderer.invoke('sync-status'),
  crossRefsRead: ()    => ipcRenderer.invoke('cross-refs-read'),
});
