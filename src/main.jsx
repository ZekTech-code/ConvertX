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

const rootEl = document.getElementById('root')
const mountPoint = document.createElement('div')
mountPoint.id = 'react-mount'
mountPoint.style.cssText = 'min-height:100vh;display:contents'
rootEl.appendChild(mountPoint)

createRoot(mountPoint).render(<App />)

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then(() => {
        })
        .catch(() => {
        });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log("Successfully unregistered service worker in development mode");
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
