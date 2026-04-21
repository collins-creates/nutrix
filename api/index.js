// Vercel serverless function for Nutrix API
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import config from '../backend/config/config.js';
import cache from '../backend/config/database.js';
import infoodsService from '../backend/services/infoodsService.js';
import usdaService from '../backend/services/usdaService.js';
import { generalLimiter, searchLimiter, autocompleteLimiter } from '../backend/middleware/security.js';
import searchRoutes from '../backend/routes/search.js';
import logger from '../backend/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    },
  },
}));

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://nutrix.vercel.app',
  credentials: true,
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// JSON parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Nutrix API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
    usdaApiKey: !!config.usda.apiKey,
    cacheStatus: cache.useRedis ? 'Redis' : 'In-memory',
    infoodsAvailable: infoodsService.isAvailable()
  });
});

// API routes with rate limiting
app.use('/api', searchLimiter, searchRoutes);
app.use('/api', autocompleteLimiter, searchRoutes);

// Serve static files for frontend
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body'
    });
  }
  
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Export the Express app for Vercel
export default app;
