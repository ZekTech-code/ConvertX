import { useState, useCallback, useRef, useEffect } from 'react';

let notifId = 0;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const addNotification = useCallback((notif) => {
    const id = ++notifId;
    const entry = { id, timestamp: Date.now(), ...notif, read: false };
    setNotifications((prev) => [entry, ...prev].slice(0, 100));
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(notif.title || 'Notification', { body: notif.message }); } catch {}
    }
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, addNotification, removeNotification, markRead, clearAll, unreadCount };
}
