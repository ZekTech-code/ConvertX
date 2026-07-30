import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const IGNORED_EXTENSION_REJECTIONS = [
  "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
];

window.addEventListener("unhandledrejection", (event) => {
  const message = event.reason?.message || String(event.reason || "");

  if (IGNORED_EXTENSION_REJECTIONS.some((ignored) => message.includes(ignored))) {
    event.preventDefault();
  }
});

/**
 * Mount React into a dedicated child element instead of directly on #root.
 * This prevents browser extensions that inject sibling/text nodes into #root
 * from causing React's reconciler to throw "removeChild: node is not a child"
 * errors during re-renders.
 *
 * StrictMode is intentionally omitted: its double-invocation of effects in dev
 * amplifies the extension-injection race and surfaces the removeChild crash far
 * more frequently than it would appear in production.
 */
const rootEl = document.getElementById('root')
const mountPoint = document.createElement('div')
mountPoint.id = 'react-mount'
mountPoint.style.cssText = 'min-height:100vh;display:contents'
rootEl.appendChild(mountPoint)

createRoot(mountPoint).render(<App />)

// PWA Service Worker Registration
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then(() => {
          // Service worker registered
        })
        .catch(() => {
          // Failed to register
        });
    });
  } else {
    // In development, unregister any active service worker to prevent caching dev assets
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log("Successfully unregistered service worker in development mode");
            // Clear caches to ensure old assets are flushed
            caches.keys().then((keys) => {
              Promise.all(keys.map((key) => caches.delete(key))).then(() => {
                window.location.reload();
              });
            });
          }
        });
      }
    });
  }
}
