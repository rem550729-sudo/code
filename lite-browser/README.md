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

## Check JavaScript syntax

```bash
npm run check
```
