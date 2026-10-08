const {
  app,
  BaseWindow,
  WebContentsView,
  clipboard,
  ClipboardItem,
  desktopCapturer,
  dialog,
  globalShortcut,
  ipcMain,
  screen,
  session
} = require('electron');
const { once } = require('node:events');
const path = require('path');

const TOOLBAR_HEIGHT = 44;
const HOME = 'https://duckduckgo.com';
const SCREENSHOT_SHORTCUT = 'CommandOrControl+Shift+S';
const VISIBILITY_SHORTCUT = 'CommandOrControl+Shift+V';
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

function toggleBrowserVisibility() {
  if (!win || win.isDestroyed()) return;

  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
  }
}

async function captureToClipboard() {
  try {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(display.size.width * display.scaleFactor),
        height: Math.round(display.size.height * display.scaleFactor)
      }
    });
    if (!sources.length) {
      console.error('No screen sources found.');
      return;
    }

    const source = sources.find((item) => item.display_id &&
      String(item.display_id) === String(display.id)) || sources[0];

    if (!source.thumbnail || source.thumbnail.isEmpty()) {
      console.error('Screenshot thumbnail is empty.');
      return;
    }

    await clipboard.write([new ClipboardItem({
      'image/png': new Blob([source.thumbnail.toPNG()], { type: 'image/png' })
    })]);
    console.log('Screenshot copied to clipboard.');
  } catch (error) {
    console.error('Screenshot capture failed:', error);
  }
}

app.whenReady().then(() => {
  const screenshotShortcutRegistered = globalShortcut.register(SCREENSHOT_SHORTCUT, async () => {
    console.log('Screenshot shortcut pressed.');
    await captureToClipboard();
  });
  console.log('Screenshot shortcut registered:', screenshotShortcutRegistered);
  if (!screenshotShortcutRegistered) {
    console.error('Unable to register screenshot shortcut:', SCREENSHOT_SHORTCUT);
  }
  if (!globalShortcut.register(VISIBILITY_SHORTCUT, toggleBrowserVisibility)) {
    console.error('Unable to register visibility shortcut:', VISIBILITY_SHORTCUT);
  }

  // No "persist:" prefix: browsing data lives only in memory.
  const priv = session.fromPartition('lite-private');
  const microphoneOrigins = new Set();
  priv.setPermissionCheckHandler((_contents, permission, origin, details) => {
    return permission === 'media' && details.mediaType === 'audio' &&
      microphoneOrigins.has(details.securityOrigin || origin);
  });
  priv.setPermissionRequestHandler((_contents, permission, callback, details) => {
    const mediaTypes = details.mediaTypes || [];
    if (permission !== 'media' || mediaTypes.length === 0 ||
        !mediaTypes.every((type) => type === 'audio')) {
      callback(false);
      return;
    }

    const origin = details.securityOrigin || new URL(details.requestingUrl).origin;
    if (microphoneOrigins.has(origin)) {
      callback(true);
      return;
    }

    dialog.showMessageBox(win, {
      type: 'question',
      title: 'Microphone permission',
      message: 'Allow microphone access?',
      detail: `${origin} wants to use your microphone.`,
      buttons: ['Allow', 'Deny'],
      defaultId: 1,
      cancelId: 1,
      noLink: true
    }).then(({ response }) => {
      const allowed = response === 0;
      if (allowed) microphoneOrigins.add(origin);
      callback(allowed);
    }).catch(() => callback(false));
  });

  win = new BaseWindow({
    title: 'Desktop Helper',
    width: 1100,
    height: 750,
    minWidth: 320,
    minHeight: 100,
    frame: false,
    resizable: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    transparent: true,
    backgroundColor: '#00000000'
  });

  const keepOnTop = () => {
    if (process.platform === 'darwin') {
      win.setAlwaysOnTop(true, 'floating', 1);
    } else {
      win.setAlwaysOnTop(true);
    }
  };
  keepOnTop();
  win.on('show', keepOnTop);
  win.on('restore', keepOnTop);

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else if (process.platform === 'linux') {
    win.setVisibleOnAllWorkspaces(true);
  }

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
  ui.setBackgroundColor('#00000000');
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

  page.webContents.on('did-finish-load', () => {
    page.webContents.insertCSS(`
      input,
      textarea,
      [contenteditable="true"] {
        cursor: default !important;
      }
    `, { cssOrigin: 'user' }).catch((error) => {
      if (!page.webContents.isDestroyed()) {
        console.error('Unable to apply text-field cursor:', error.message);
      }
    });
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
  onToolbar('screenshot', captureToClipboard);
  onToolbar('close', () => win.close());

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

app.on('will-quit', () => {
  globalShortcut.unregister(SCREENSHOT_SHORTCUT);
  globalShortcut.unregister(VISIBILITY_SHORTCUT);
});
