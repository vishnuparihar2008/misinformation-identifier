let ioInstance = null;

export function initSocketService(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}

export function emitCheckCreated(check) {
  if (!ioInstance) return;
  const payload = {
    id: check._id.toString(),
    status: check.status,
    textPreview: check.text ? check.text.substring(0, 100) : '',
  };
  ioInstance.emit('check:created', payload);
}

export function emitCheckUpdated(check) {
  if (!ioInstance) return;
  ioInstance.emit('check:updated', check.toObject ? check.toObject() : check);
}

export function emitCheckFailed(checkId, reason) {
  if (!ioInstance) return;
  ioInstance.emit('check:failed', {
    id: checkId.toString(),
    reason: reason || 'Unknown error during analysis',
  });
}

