import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

// Base health route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'RAG Backend Server is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static assets from client/dist if build exists
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // Catch-all for SPA client routing (excluding /api routes)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Fallback root message when frontend is run separately in dev mode
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: '🚀 RAG Backend Server is running successfully!',
      endpoints: {
        health: 'GET /health',
        upload: 'POST /api/documents/upload'
      }
    });
  });
}

// Multer / Global Error Handler
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'An error occurred during file upload'
    });
  }
  next();
});

export default app;
