import { AppState, CompletedTrade } from '../types';
import { loadAppState, saveAppState, sanitizeAppState } from './initialData';

const STORAGE_KEY = 'tilt_filter_state_v3';
const SYNC_CHANNEL_NAME = 'tilt_companion_state_sync_v1';

// Unique ID for each window instance to prevent reflection loops
export const CLIENT_INSTANCE_ID = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Track opened popup windows
const childWindows = new Set<Window>();

export function registerChildWindow(win: Window | null) {
  if (win && !win.closed) {
    childWindows.add(win);
  }
}

// Clean closed child windows
function cleanChildWindows() {
  childWindows.forEach((win) => {
    if (win.closed) {
      childWindows.delete(win);
    }
  });
}

// Global broadcast channel instance if available
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not available, using storage event sync fallback', e);
}

export interface SyncEventDetail {
  type: 'STATE_SYNC' | 'TRADE_LOGGED' | 'TRADE_UPDATED' | 'TRADE_SYNC' | 'REQUEST_STATE_SYNC';
  trade?: CompletedTrade;
  tradeId?: string;
  trades?: CompletedTrade[];
}

export type SyncCallback = (
  newState: AppState,
  sourceInstanceId: string,
  eventDetail?: SyncEventDetail
) => void;

/**
 * Sends a request to all open windows/tabs to immediately broadcast their latest in-memory state.
 */
export function requestStateSync() {
  const payload = {
    type: 'REQUEST_STATE_SYNC' as const,
    instanceId: CLIENT_INSTANCE_ID,
    timestamp: Date.now(),
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      // ignore
    }
  }

  if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(payload, '*');
    } catch (e) {
      // ignore
    }
  }

  cleanChildWindows();
  childWindows.forEach((childWin) => {
    try {
      if (!childWin.closed) {
        childWin.postMessage(payload, '*');
      }
    } catch (e) {
      // ignore
    }
  });
}

/**
 * Resolves the absolute application URL reliably across iframe, preview, and standalone contexts.
 */
export function getAppUrl(): string {
  try {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.href && (window.location.href.startsWith('http://') || window.location.href.startsWith('https://'))) {
        return window.location.href;
      }
      if (window.location.origin && (window.location.origin.startsWith('http://') || window.location.origin.startsWith('https://'))) {
        return window.location.origin + (window.location.pathname || '/');
      }
    }
  } catch (e) {
    console.warn('Error reading window.location:', e);
  }
  return '/';
}

/**
 * Opens the application in a new browser tab with full standard browser capabilities.
 */
export function openInNewTab(): Window | null {
  if (typeof window === 'undefined') return null;
  const targetUrl = getAppUrl();
  try {
    const win = window.open(targetUrl, '_blank');
    if (win) {
      registerChildWindow(win);
    }
    return win;
  } catch (err) {
    console.error('Failed to open in new tab:', err);
    return null;
  }
}

/**
 * Robustly opens the React application in a detached standalone window.
 * Avoids racing win.location and registers the window for real-time state synchronization.
 */
export function openDetachedWindow(width = 1380, height = 880): Window | null {
  if (typeof window === 'undefined') return null;

  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  const targetUrl = getAppUrl();

  const windowFeatures = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;

  let win: Window | null = null;

  try {
    // Using '_blank' ensures a fresh top-level document is created and loaded
    win = window.open(targetUrl, '_blank', windowFeatures);
  } catch (err) {
    console.warn('Popup window.open with features was blocked or failed:', err);
  }

  // Fallback to standard new tab if popup is blocked
  if (!win) {
    try {
      win = window.open(targetUrl, '_blank');
    } catch (err) {
      console.error('Fallback window.open failed:', err);
    }
  }

  if (win) {
    try {
      win.focus();
    } catch {
      // ignore
    }

    registerChildWindow(win);
  }

  return win;
}

/**
 * Broadcasts updated state to all other open tabs, iframes, and pop-out windows.
 */
export function broadcastStateChange(state: AppState) {
  // 1. Save to LocalStorage immediately
  saveAppState(state);

  const payload = {
    type: 'STATE_SYNC' as const,
    instanceId: CLIENT_INSTANCE_ID,
    timestamp: Date.now(),
    trades: state.trades,
    accounts: state.accounts,
    state,
  };

  // 2. Send via BroadcastChannel (instant across tabs/windows in same origin)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      console.warn('Failed to broadcast via channel', e);
    }
  }

  // 3. Direct PostMessage to opener if this is a pop-out window
  if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(payload, '*');
    } catch (e) {
      // ignore cross-origin if any
    }
  }

  // 4. Direct PostMessage to all registered child pop-outs
  cleanChildWindows();
  childWindows.forEach((childWin) => {
    try {
      if (!childWin.closed) {
        childWin.postMessage(payload, '*');
      }
    } catch (e) {
      // ignore
    }
  });
}

/**
 * Instantly broadcasts a newly logged trade with full trade payload and updated journal state
 * directly to popped-out windows, parent window, and other tabs.
 */
export function broadcastTradeLogged(trade: CompletedTrade, state: AppState) {
  // 1. Persist state immediately to storage
  saveAppState(state);

  const payload = {
    type: 'TRADE_LOGGED' as const,
    instanceId: CLIENT_INSTANCE_ID,
    timestamp: Date.now(),
    trade,
    trades: state.trades,
    accounts: state.accounts,
    state,
  };

  // 2. Send via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      console.warn('Failed to broadcast trade via channel', e);
    }
  }

  // 3. Direct PostMessage to opener
  if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(payload, '*');
    } catch (e) {
      // ignore
    }
  }

  // 4. Direct PostMessage to all registered child pop-outs
  cleanChildWindows();
  childWindows.forEach((childWin) => {
    try {
      if (!childWin.closed) {
        childWin.postMessage(payload, '*');
      }
    } catch (e) {
      // ignore
    }
  });
}

/**
 * Broadcasts trade journal updates (discipline tag, memo, screenshot, risk changes)
 */
export function broadcastTradeUpdated(tradeId: string, state: AppState) {
  // 1. Persist to storage
  saveAppState(state);

  const payload = {
    type: 'TRADE_UPDATED' as const,
    instanceId: CLIENT_INSTANCE_ID,
    timestamp: Date.now(),
    tradeId,
    trades: state.trades,
    accounts: state.accounts,
    state,
  };

  // 2. Send via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      console.warn('Failed to broadcast trade update via channel', e);
    }
  }

  // 3. Direct PostMessage to opener
  if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(payload, '*');
    } catch (e) {
      // ignore
    }
  }

  // 4. Direct PostMessage to all registered child pop-outs
  cleanChildWindows();
  childWindows.forEach((childWin) => {
    try {
      if (!childWin.closed) {
        childWin.postMessage(payload, '*');
      }
    } catch (e) {
      // ignore
    }
  });
}

/**
 * Subscribes to real-time state and trade journal updates from other windows/tabs/iframes.
 */
export function subscribeToStateSync(onSync: SyncCallback): () => void {
  // Handler for incoming sync messages
  const processIncomingMessage = (data: any) => {
    if (!data || typeof data !== 'object') return;
    const { type, instanceId, state, trade, tradeId, trades } = data;

    if (instanceId === CLIENT_INSTANCE_ID) return;

    if (type === 'REQUEST_STATE_SYNC') {
      // Respond to sync request with current freshest state
      try {
        const currentState = loadAppState();
        broadcastStateChange(currentState);
      } catch (e) {
        // ignore
      }
      return;
    }

    if (
      type === 'STATE_SYNC' ||
      type === 'TRADE_LOGGED' ||
      type === 'TRADE_UPDATED' ||
      type === 'TRADE_SYNC'
    ) {
      if (state) {
        onSync(sanitizeAppState(state), instanceId, {
          type,
          trade,
          tradeId,
          trades: Array.isArray(trades) ? trades : state.trades,
        });
      }
    }
  };

  // 1. Listen on BroadcastChannel
  const handleBroadcastMessage = (event: MessageEvent) => {
    processIncomingMessage(event.data);
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // 2. Listen on Storage event (fires in other windows when localStorage changes)
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const freshState = loadAppState();
        onSync(freshState, 'storage_event', { type: 'STATE_SYNC', trades: freshState.trades });
      } catch (e) {
        console.error('Failed to parse storage event state', e);
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 3. Listen on Window postMessage (for direct opener <-> popup communications)
  const handlePostMessage = (event: MessageEvent) => {
    processIncomingMessage(event.data);
  };
  window.addEventListener('message', handlePostMessage);

  // Return unsubscribe cleanup function
  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('message', handlePostMessage);
  };
}
