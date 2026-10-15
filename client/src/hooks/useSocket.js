import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socket = null;

function getSocket() {
  if (!socket) {
    socket = io('/', { transports: ['websocket', 'polling'] });
  }
  return socket;
}

/**
 * Subscribe to Socket.IO check events.
 * Automatically cleans up listeners on unmount.
 */
export function useSocket({ onCheckCreated, onCheckUpdated, onCheckFailed } = {}) {
  const handlersRef = useRef({ onCheckCreated, onCheckUpdated, onCheckFailed });

  // Keep handlers fresh without re-subscribing
  useEffect(() => {
    handlersRef.current = { onCheckCreated, onCheckUpdated, onCheckFailed };
  });

  const stableCreated = useCallback((data) => handlersRef.current.onCheckCreated?.(data), []);
  const stableUpdated = useCallback((data) => handlersRef.current.onCheckUpdated?.(data), []);
  const stableFailed = useCallback((data) => handlersRef.current.onCheckFailed?.(data), []);

  useEffect(() => {
    const s = getSocket();
    s.on('check:created', stableCreated);
    s.on('check:updated', stableUpdated);
    s.on('check:failed', stableFailed);

    return () => {
      s.off('check:created', stableCreated);
      s.off('check:updated', stableUpdated);
      s.off('check:failed', stableFailed);
    };
  }, [stableCreated, stableUpdated, stableFailed]);
}

