import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 5000;

// Start Express server and connect to MongoDB Atlas
const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
    // Attempt DB connection (non-blocking)
    connectDB();
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
