import tokenStore from '../../../services/tokenStore';

const subscriptions = new Map();
let socket = null;
let connected = false;
let connecting = false;
let intentionalClose = false;
let reconnectTimer = null;
let reconnectDelay = 2500;
let nextSubscriptionId = 1;
let generation = 0;
let authToken = tokenStore.getMemberToken() ?? null;

const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/api\/v\d+\/?$/i, '').replace(/\/$/, '');
const defaultWsUrl = apiBase.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:') + '/ws';
const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;

function frame(command, headers = {}, body = '') {
  const headerText = Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n');
  return `${command}\n${headerText}\n\n${body}\0`;
}

function sendRaw(value) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(value);
}

function parseFrames(buffer) {
  return buffer.split('\0').map((raw) => raw.replace(/^\r?\n+/, '')).filter(Boolean).map((raw) => {
    const boundary = raw.indexOf('\n\n');
    if (boundary < 0) return null;
    const head = raw.slice(0, boundary).split(/\r?\n/);
    const headers = {};
    head.slice(1).forEach((line) => {
      const index = line.indexOf(':');
      if (index > -1) headers[line.slice(0, index)] = line.slice(index + 1);
    });
    return { command: head[0], headers, body: raw.slice(boundary + 2) };
  }).filter(Boolean);
}

function activeDestinations() {
  return [...subscriptions.entries()].filter(([, entry]) => entry.callbacks.size > 0);
}

function subscribeDestination(destination, entry) {
  if (!connected || entry.serverId) return;
  entry.serverId = `sub-${nextSubscriptionId++}`;
  sendRaw(frame('SUBSCRIBE', { id: entry.serverId, destination, ack: 'auto' }));
}

function sendSubscriptions() {
  activeDestinations().forEach(([destination, entry]) => {
    entry.serverId = null;
    subscribeDestination(destination, entry);
  });
}

function scheduleReconnect() {
  if (intentionalClose || reconnectTimer || activeDestinations().length === 0) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(15000, Math.round(reconnectDelay * 1.5));
}

function handleFrame(message, socketGeneration) {
  if (socketGeneration !== generation) return;
  if (message.command === 'CONNECTED') {
    connected = true;
    connecting = false;
    reconnectDelay = 2500;
    sendSubscriptions();
    return;
  }
  if (message.command === 'MESSAGE') {
    const entry = [...subscriptions.values()].find((item) => item.serverId === message.headers.subscription);
    if (!entry) return;
    let body;
    try { body = JSON.parse(message.body); } catch { return; }
    entry.callbacks.forEach((callback) => {
      try { callback(body?.data ?? body); } catch (error) { console.error('STOMP location handler failed', error); }
    });
    return;
  }
  if (message.command === 'ERROR') {
    console.error('STOMP broker error:', message.body || message.headers.message || 'Unknown error');
  }
}

function connect() {
  if (intentionalClose || connecting || connected || activeDestinations().length === 0) return;
  if (!wsUrl) {
    console.error('WebSocket URL is not configured. Set VITE_WS_URL.');
    return;
  }
  connecting = true;
  const socketGeneration = ++generation;
  let candidate;
  try { candidate = new WebSocket(wsUrl); } catch (error) {
    connecting = false;
    console.error('Unable to create STOMP WebSocket', error);
    scheduleReconnect();
    return;
  }
  socket = candidate;
  candidate.onopen = () => {
    if (socketGeneration !== generation || candidate !== socket) return;
    const headers = { 'accept-version': '1.2', 'heart-beat': '10000,10000' };
    const token = authToken ?? tokenStore.getMemberToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    sendRaw(frame('CONNECT', headers));
  };
  let pending = '';
  candidate.onmessage = (event) => {
    if (socketGeneration !== generation || candidate !== socket) return;
    pending += String(event.data ?? '');
    const lastNull = pending.lastIndexOf('\0');
    if (lastNull < 0) return;
    const complete = pending.slice(0, lastNull + 1);
    pending = pending.slice(lastNull + 1);
    parseFrames(complete).forEach((message) => handleFrame(message, socketGeneration));
  };
  candidate.onerror = () => {
    if (socketGeneration === generation) connecting = false;
  };
  candidate.onclose = () => {
    if (socketGeneration !== generation || candidate !== socket) return;
    socket = null;
    connected = false;
    connecting = false;
    subscriptions.forEach((entry) => { entry.serverId = null; });
    scheduleReconnect();
  };
}

function disconnectSocket() {
  intentionalClose = true;
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  reconnectTimer = null;
  const old = socket;
  socket = null;
  connected = false;
  connecting = false;
  generation += 1;
  if (old?.readyState === WebSocket.OPEN) {
    try { old.send(frame('DISCONNECT')); } catch { /* best effort */ }
  }
  try { old?.close(); } catch { /* best effort */ }
  intentionalClose = false;
}

const sharedStomp = {
  subscribe(destination, callback) {
    let entry = subscriptions.get(destination);
    if (!entry) {
      entry = { callbacks: new Set(), serverId: null };
      subscriptions.set(destination, entry);
    }
    entry.callbacks.add(callback);
    if (connected) subscribeDestination(destination, entry);
    else connect();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      entry.callbacks.delete(callback);
      if (entry.callbacks.size === 0) {
        if (entry.serverId && connected) sendRaw(frame('UNSUBSCRIBE', { id: entry.serverId }));
        entry.serverId = null;
        subscriptions.delete(destination);
      }
      if (activeDestinations().length === 0) disconnectSocket();
    };
  },

  publish(destination, payload) {
    if (!connected) return false;
    sendRaw(frame('SEND', {
      destination,
      'content-type': 'application/json',
    }, JSON.stringify(payload)));
    return true;
  },

  updateAuth(token = tokenStore.getMemberToken()) {
    const nextToken = token ?? null;
    if (nextToken === authToken) return;
    authToken = nextToken;
    if (activeDestinations().length) {
      disconnectSocket();
      connect();
    }
  },

  disconnect() {
    subscriptions.forEach((entry) => {
      if (entry.serverId && connected) sendRaw(frame('UNSUBSCRIBE', { id: entry.serverId }));
    });
    subscriptions.clear();
    disconnectSocket();
  },

  get connected() { return connected; },
};

export default sharedStomp;
