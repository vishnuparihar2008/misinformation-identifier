import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocketService } from './services/socket.service.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import checksRoutes from './routes/checks.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import { initTelegramBot } from './adapters/telegram.adapter.js';

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initSocketService(io);

// Mount API routes per API_SPEC.md (/api)
app.use('/api', healthRoutes);
app.use('/api', checksRoutes);
app.use('/api', groupsRoutes);

// Centralised error handling middleware
app.use(errorHandler);

// Start server after DB attempt
async function startServer() {
  await connectDB();

  server.listen(config.port, async () => {
    console.log(`[SachCheck Server] Running on http://localhost:${config.port}`);
    console.log(`[SachCheck Server] Socket.IO enabled. AI service targeting: ${config.aiServiceUrl}`);

    // Start Telegram bot adapter
    await initTelegramBot();
  });
}

startServer();

export { app, server };

