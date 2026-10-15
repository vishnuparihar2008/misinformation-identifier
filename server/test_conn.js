import mongoose from 'mongoose';

async function test() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/sachcheck', { serverSelectionTimeoutMS: 2000 });
    console.log('CONNECTED_TO_LOCAL_MONGO');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('MONGO_CONNECT_ERROR:', err.message);
    process.exit(1);
  }
}

test();

