const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browser', {
  go: (text) => ipcRenderer.send('go', text),
  back: () => ipcRenderer.send('back'),
  forward: () => ipcRenderer.send('forward'),
  reload: () => ipcRenderer.send('reload'),
  home: () => ipcRenderer.send('home'),
  onUrl: (callback) => {
    ipcRenderer.on('url', (_event, url) => callback(url));
  }
});
