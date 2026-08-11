import { useEffect } from 'react';


const IS_PRODUCTION = import.meta.env.PROD;

const BLOCKED_SHORTCUTS = [
  { key: 'F12' },
  { key: 'I', ctrl: true, shift: true },
  { key: 'i', ctrl: true, shift: true },
  { key: 'J', ctrl: true, shift: true },
  { key: 'j', ctrl: true, shift: true },
  { key: 'C', ctrl: true, shift: true },
  { key: 'c', ctrl: true, shift: true },
  { key: 'U', ctrl: true },
  { key: 'u', ctrl: true },
  { key: 'S', ctrl: true },
  { key: 's', ctrl: true },
];

function isBlockedShortcut(e) {
  const ctrlOrMeta = e.ctrlKey || e.metaKey;

  return BLOCKED_SHORTCUTS.some((shortcut) => {
    if (shortcut.key !== e.key) return false;
    if (shortcut.ctrl && !ctrlOrMeta) return false;
    if (shortcut.shift && !e.shiftKey) return false;
    return true;
  });
}

export default function useSecurity() {
  useEffect(() => {
    if (!IS_PRODUCTION) return;

    const onContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const onKeyDown = (e) => {
      if (isBlockedShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const onDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    let devtoolsWarned = false;
    const THRESHOLD = 160;

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

    const originalUserSelect = document.body.style.userSelect;
    const originalWebkitUserSelect = document.body.style.webkitUserSelect;
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('dragstart', onDragStart, true);
    window.addEventListener('resize', checkDevTools);

    checkDevTools();

    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('dragstart', onDragStart, true);
      window.removeEventListener('resize', checkDevTools);

      document.body.style.userSelect = originalUserSelect;
      document.body.style.webkitUserSelect = originalWebkitUserSelect;
      document.title = 'ConvertX - Secure Live Currency Converter';
    };
  }, []);
}
