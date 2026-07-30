import { useEffect } from 'react';

/**
 * useSecurity — Frontend security guard hook.
 *
 * Applies runtime protections that deter casual inspection and
 * tampering of the application in the browser.
 *
 * Protections applied:
 *  1. Blocks right-click context menu
 *  2. Intercepts DevTools keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
 *  3. Disables text selection and drag to prevent easy copy-paste of UI content
 *  4. Detects and warns when DevTools window is opened (size-based heuristic)
 *
 * NOTE: These are deterrents for casual users, not foolproof locks.
 * True security comes from never shipping secrets to the client.
 *
 * Only active in production builds. In development, all guards are
 * disabled so that the developer experience is unimpaired.
 */

const IS_PRODUCTION = import.meta.env.PROD;

/* ------------------------------------------------------------------ */
/*  Blocked keyboard shortcuts                                         */
/* ------------------------------------------------------------------ */
const BLOCKED_SHORTCUTS = [
  // F12 — DevTools
  { key: 'F12' },
  // Ctrl/Cmd + Shift + I — Inspect Element
  { key: 'I', ctrl: true, shift: true },
  { key: 'i', ctrl: true, shift: true },
  // Ctrl/Cmd + Shift + J — Console
  { key: 'J', ctrl: true, shift: true },
  { key: 'j', ctrl: true, shift: true },
  // Ctrl/Cmd + Shift + C — Element picker
  { key: 'C', ctrl: true, shift: true },
  { key: 'c', ctrl: true, shift: true },
  // Ctrl/Cmd + U — View Source
  { key: 'U', ctrl: true },
  { key: 'u', ctrl: true },
  // Ctrl/Cmd + S — Save page
  { key: 'S', ctrl: true },
  { key: 's', ctrl: true },
];

/**
 * Returns true if the given keyboard event matches a blocked shortcut.
 */
function isBlockedShortcut(e) {
  const ctrlOrMeta = e.ctrlKey || e.metaKey;

  return BLOCKED_SHORTCUTS.some((shortcut) => {
    if (shortcut.key !== e.key) return false;
    if (shortcut.ctrl && !ctrlOrMeta) return false;
    if (shortcut.shift && !e.shiftKey) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
export default function useSecurity() {
  useEffect(() => {
    // Skip all protections in development so DevTools remain accessible.
    if (!IS_PRODUCTION) return;

    /* --- 1. Block context menu (right-click) --- */
    const onContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    /* --- 2. Block DevTools keyboard shortcuts --- */
    const onKeyDown = (e) => {
      if (isBlockedShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    /* --- 3. Disable drag (prevents dragging images/links to inspect) --- */
    const onDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    /* --- 4. DevTools open detector (size-based heuristic) --- */
    let devtoolsWarned = false;
    const THRESHOLD = 160; // px — typical DevTools panel width/height

    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth > THRESHOLD;
      const heightDiff = window.outerHeight - window.innerHeight > THRESHOLD;

      if ((widthDiff || heightDiff) && !devtoolsWarned) {
        devtoolsWarned = true;
        document.title = '⚠️ Security Alert — ConvertX';
      } else if (!widthDiff && !heightDiff && devtoolsWarned) {
        devtoolsWarned = false;
        document.title = 'ConvertX - Secure Live Currency Converter';
      }
    };

    /* --- 5. Disable text selection via CSS (non-destructive) --- */
    const originalUserSelect = document.body.style.userSelect;
    const originalWebkitUserSelect = document.body.style.webkitUserSelect;
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    /* --- Attach listeners --- */
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('dragstart', onDragStart, true);
    window.addEventListener('resize', checkDevTools);

    // Run initial check
    checkDevTools();

    /* --- Cleanup on unmount --- */
    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('dragstart', onDragStart, true);
      window.removeEventListener('resize', checkDevTools);

      // Restore original styles
      document.body.style.userSelect = originalUserSelect;
      document.body.style.webkitUserSelect = originalWebkitUserSelect;
      document.title = 'ConvertX - Secure Live Currency Converter';
    };
  }, []);
}
