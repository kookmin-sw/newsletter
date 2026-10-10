const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('signage', {
  snapshot: () => ipcRenderer.invoke('snapshot'),
  clock: () => ipcRenderer.invoke('clock'),
  saveSetup: (settings) => ipcRenderer.invoke('save-setup', settings),
  refresh: () => ipcRenderer.invoke('refresh'),
  prepared: (revision, error) => ipcRenderer.invoke('prepared', { revision, error }),
  quit: () => ipcRenderer.invoke('quit'),
  checkAppUpdate: () => ipcRenderer.invoke('check-app-update'),
  downloadAppUpdate: () => ipcRenderer.invoke('download-app-update'),
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),
  subscribe: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state', listener);
    return () => ipcRenderer.removeListener('state', listener);
  },
});
