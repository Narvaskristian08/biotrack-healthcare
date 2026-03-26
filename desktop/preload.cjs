const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('biotrackDesktop', {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
});
