const { app, BaseWindow, WebContentsView, ipcMain, session } = require('electron');
const { once } = require('node:events');
const path = require('path');

const TOOLBAR_HEIGHT = 44;
const HOME = 'https://duckduckgo.com';
let win, ui, page;

// Turn typed text into a URL or a search.
function toUrl(input) {
  const text = input.trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(text)) return 'https://' + text;
  return 'https://duckduckgo.com/?q=' + encodeURIComponent(text);
}

function layout() {
  const { width, height } = win.getContentBounds();
  ui.setBounds({ x: 0, y: 0, width, height: TOOLBAR_HEIGHT });
  page.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width, height: Math.max(0, height - TOOLBAR_HEIGHT) });
}

function loadPage(url) {
  page.webContents.loadURL(url).catch((error) => {
    if (error.code !== 'ERR_ABORTED') console.error('Unable to load page:', error.message);
  });
}

app.whenReady().then(() => {
  // No "persist:" prefix: browsing data lives only in memory.
  const priv = session.fromPartition('lite-private');
  priv.setPermissionCheckHandler(() => false);
  priv.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  win = new BaseWindow({
    title: 'Lite Browser',
    width: 1100,
    height: 750,
    minWidth: 320,
    minHeight: 100,
    autoHideMenuBar: true,
    backgroundColor: '#111'
  });

  if (process.platform === 'win32' || process.platform === 'darwin') {
    win.setContentProtection(true);
  }

  ui = new WebContentsView({
    webPreferences: {
      partition: 'lite-ui',
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  page = new WebContentsView({
    webPreferences: {
      session: priv,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  win.contentView.addChildView(ui);
  win.contentView.addChildView(page);
  layout();
  win.on('resize', layout);

  // BaseWindow does not automatically dispose of its views' web contents.
  win.on('closed', () => {
    ui.webContents.close();
    page.webContents.close();
  });

  // Open web links requesting a new window in the existing page instead.
  page.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) loadPage(url);
    return { action: 'deny' };
  });
  page.webContents.on('will-navigate', (event, url) => {
    if (!/^https?:\/\//i.test(url)) event.preventDefault();
  });

  const sendUrl = () => {
    if (!ui.webContents.isDestroyed()) {
      ui.webContents.send('url', page.webContents.getURL());
    }
  };
  ui.webContents.on('did-finish-load', sendUrl);
  page.webContents.on('did-navigate', sendUrl);
  page.webContents.on('did-navigate-in-page', sendUrl);

  // Only the local toolbar can issue browser commands.
  const onToolbar = (channel, action) => {
    ipcMain.on(channel, (event, ...args) => {
      if (event.sender === ui.webContents) action(...args);
    });
  };
  const nav = page.webContents.navigationHistory;
  onToolbar('go', (text) => {
    if (typeof text !== 'string' || !text.trim()) return;
    page.webContents.focus();
    loadPage(toUrl(text));
  });
  onToolbar('back', () => nav.canGoBack() && nav.goBack());
  onToolbar('forward', () => nav.canGoForward() && nav.goForward());
  onToolbar('reload', () => page.webContents.reload());
  onToolbar('home', () => loadPage(HOME));

  ui.webContents.loadFile(path.join(__dirname, 'index.html'));
  loadPage(HOME);
});

app.on('before-quit', (event) => {
  if (win && !win.isDestroyed()) {
    event.preventDefault();
    win.close();
  }
});

app.on('window-all-closed', async () => {
  // Let both views finish closing before Electron shuts down its event loop.
  await Promise.all([ui, page]
    .filter((view) => !view.webContents.isDestroyed())
    .map((view) => once(view.webContents, 'destroyed')));
  app.quit();
});
