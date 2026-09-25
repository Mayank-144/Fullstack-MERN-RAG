import express from 'express';
import cors from 'cors';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

// Root welcome route for browser testing
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

// Base health route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'RAG Backend Server is running smoothly',
    timestamp: new Date().toISOString()
  });
});

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
