import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Node.js on Windows SRV DNS resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported in some container environments
}

/**
 * Connect to MongoDB Atlas
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>') || uri.includes('<db_password>') || uri.trim() === '') {
    console.log('⚠️  MONGODB_URI not fully configured in .env yet. Server running for endpoint testing.');
    return;
  }
  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
};
