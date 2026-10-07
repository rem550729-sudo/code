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

## Screenshot to clipboard

While the app is running, press **Ctrl + Shift + S** on Windows/Linux or
**Cmd + Shift + S** on macOS. The global shortcut works even when another app has
focus. It copies a screenshot directly to the OS clipboard. Use **Ctrl + V** or
**Cmd + V** in an application that accepts pasted images.

Capture first selects the display under the mouse pointer by display ID. If no
ID matches, it captures the first available screen, which can be another monitor.
It requests a thumbnail size adjusted for the target display's scale factor,
including high-DPI displays. The image is written as an in-memory PNG using
Electron 44's asynchronous clipboard API.

Desktop captures can omit Lite Browser's protected window on Windows/macOS,
depending on the capture method.

- **macOS:** Allow Screen Recording access for the app in System Settings →
  Privacy & Security. During `npm start`, the app is normally listed as Electron.
- **Linux Wayland:** The desktop portal controls screen selection and global
  shortcut availability. Mouse-position display selection is not supported by
  Electron on Wayland; the system may ask you to select a screen.

The terminal logs `Screenshot shortcut registered: true` or `false` at startup,
and `Screenshot shortcut pressed.` on activation. If another application owns
the shortcut, registration fails. The shortcut is released when the app exits.

## Session and security

- Cookies, site storage, browsing history, and cache use an in-memory session and
  are discarded when the application exits.
- Audio-only microphone requests require approval in an Allow/Deny dialog.
- Camera, location, notifications, and other website permission requests are denied.
- Web pages run with sandboxing and context isolation enabled, without Node.js
  integration. Browser navigation is restricted to HTTP and HTTPS.
- The app has no telemetry, analytics, or history logging.

## Microphone access

Websites can request the microphone with
`navigator.mediaDevices.getUserMedia({ audio: true })` on HTTPS or localhost pages.
The dialog identifies the requesting site. Choose **Allow** to enable audio
capture, or **Deny** to reject the request. Approval applies to that site for the
current application run and is discarded when the app exits.

Requests that include video, including combined audio/video requests, are denied.

The operating system must also allow microphone access:

- **Windows:** Open Settings → Privacy & security → Microphone. Enable
  **Microphone access** and **Let desktop apps access your microphone**.
- **macOS:** Open System Settings → Privacy & Security → Microphone. Enable the
  app listed there, which is normally **Electron** when using `npm start`.

## Window size and cursor

The browser opens at 1100 × 750 pixels with native resizing enabled using
Electron's `resizable: true` option. The minimum window size is 320 × 100 pixels.

The toolbar, navigation buttons, and address field use the standard arrow cursor
through scoped CSS. Button hover and keyboard focus styles identify interactive
controls.

On each page load, a user-origin stylesheet sets `cursor: default` for `input`,
`textarea`, and `[contenteditable="true"]`. The rule uses `!important` to take
priority over website cursor styles. Text fields keep their visible typing caret.

## Window appearance and stacking

The browser uses a transparent, frameless window with a translucent dark toolbar
and `backdrop-filter: blur(18px)`. The toolbar's native view background is also
transparent. Drag the toolbar's background or gaps to move the window, and use
the **×** button to close it.

Always-on-top is enabled when the window is created and reapplied when it is
shown or restored. This uses the macOS floating window level and the default
topmost level on other platforms. Workspace visibility is enabled on macOS and
Linux where supported; macOS also requests visibility in fullscreen Spaces.

Window stacking and transparency depend on the operating system and compositor.
Fullscreen and system windows can use higher window levels. Electron's
always-on-top API is not supported on Linux Wayland.

## Taskbar behavior

The browser window uses Electron's `skipTaskbar: true` option to request omission
from the taskbar while remaining visible and usable.

Electron documents this option for Windows and macOS. Linux behavior depends on
the desktop environment and window manager. On macOS, the application's Dock icon
is controlled separately from this window-level option.

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
