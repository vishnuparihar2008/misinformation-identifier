import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] Atlas connection error (${error.message}). Attempting fallback to local MongoDB...`);
    try {
      const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/sachcheck', {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`[Database] Local MongoDB Connected: ${localConn.connection.host}`);
      return localConn;
    } catch (localError) {
      console.error(`[Database] Local MongoDB connection failed: ${localError.message}`);
      return null;
    }
  }
}
