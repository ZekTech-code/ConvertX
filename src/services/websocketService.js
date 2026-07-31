const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.listeners = new Map();
    this.reconnectAttempts = new Map();
    this.mounted = true;
  }

  connect(id, url, protocols) {
    if (this.connections.has(id)) return;
    this.reconnectAttempts.set(id, 0);
    this._createConnection(id, url, protocols);
  }

  _createConnection(id, url, protocols) {
    if (!this.mounted) return;
    try {
      const ws = new WebSocket(url, protocols);
      ws.onopen = () => {
        this.reconnectAttempts.set(id, 0);
        this._emit(id, 'open');
        this._emit('*', 'reconnect', { id, status: 'connected' });
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._emit(id, 'message', data);
          this._emit('*', 'message', { id, data });
        } catch {
          this._emit(id, 'message', event.data);
        }
      };
      ws.onerror = () => {
        this._emit(id, 'error');
      };
      ws.onclose = () => {
        this.connections.delete(id);
        this._emit(id, 'close');
        this._scheduleReconnect(id, url, protocols);
      };
      this.connections.set(id, ws);
    } catch {
      this._scheduleReconnect(id, url, protocols);
    }
  }

  _scheduleReconnect(id, url, protocols) {
    if (!this.mounted) return;
    const attempt = this.reconnectAttempts.get(id) || 0;
    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempts.set(id, attempt + 1);
    setTimeout(() => {
      if (this.mounted) this._createConnection(id, url, protocols);
    }, delay);
  }

  disconnect(id) {
    const ws = this.connections.get(id);
    if (ws) {
      if (ws.readyState !== WebSocket.CLOSED) ws.close();
      this.connections.delete(id);
    }
    this.reconnectAttempts.delete(id);
  }

  disconnectAll() {
    for (const [id] of this.connections) this.disconnect(id);
  }

  send(id, data) {
    const ws = this.connections.get(id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  on(id, event, callback) {
    const key = `${id}:${event}`;
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key)?.delete(callback);
  }

  _emit(id, event, data) {
    const key = `${id}:${event}`;
    this.listeners.get(key)?.forEach((cb) => cb(data));
  }

  destroy() {
    this.mounted = false;
    this.disconnectAll();
    this.listeners.clear();
  }
}

export const wsManager = new WebSocketManager();
export default WebSocketManager;
