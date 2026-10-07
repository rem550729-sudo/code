# Lite Browser

A minimal Electron browser with a dark address bar, DuckDuckGo search, and back,
forward, reload, and home controls.

## Run

Use Node.js 22.12 or newer and a graphical desktop environment.

```bash
cd lite-browser
npm install
npm start
```

Type a URL or domain such as `example.com`, or enter words to search DuckDuckGo.
Press **Enter** to navigate. Links that request a new window open in the same view.

## Session and security

- Cookies, site storage, browsing history, and cache use an in-memory session and
  are discarded when the application exits.
- Website permission requests, including camera, microphone, location, and
  notifications, are denied.
- Web pages run with sandboxing and context isolation enabled, without Node.js
  integration. Browser navigation is restricted to HTTP and HTTPS.
- The app has no telemetry, analytics, or history logging.

## Window content protection

On Windows and macOS, the browser automatically enables Electron's
[`setContentProtection(true)`](https://www.electronjs.org/docs/latest/api/base-window#winsetcontentprotectionenable)
for the entire window, including the toolbar and page.

- **Windows:** Uses `WDA_EXCLUDEFROMCAPTURE`. Compatible capture applications omit
  the window on Windows 10 version 2004 and newer; older versions show it as black.
- **macOS:** Uses `NSWindowSharingNone`. Applications using ScreenCaptureKit can
  still capture the window, so protection depends on the capture method.
- **Linux:** Electron does not support this protection; the API call is skipped.

## Check JavaScript syntax

```bash
npm run check
```
