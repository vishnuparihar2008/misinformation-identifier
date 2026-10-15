import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sachcheck',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  nudgeThreshold: parseFloat(process.env.NUDGE_THRESHOLD || '0.70'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_sachcheck',
};

