const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const config = require('./config/config');
const cache = require('./config/database');
const infoodsService = require('./services/infoodsService');
const { generalLimiter, searchLimiter, autocompleteLimiter } = require('./middleware/security');
const searchRoutes = require('./routes/search');
const logger = require('./utils/logger');

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

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(generalLimiter);

// Test route to verify Express routing
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test route working',
    query: req.query
  });
});

// Health check endpoint (before other routes)
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

// API routes with specific rate limiting
console.log('Mounting API routes...');
app.use('/api', searchLimiter, searchRoutes);
console.log('API routes mounted');

// Global error handler
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

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize cache
    await cache.initialize();
    
    // Initialize INFOODS service
    await infoodsService.initialize();
    
    // Start server
    app.listen(config.port, () => {
      logger.info(`Nutrix server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Cache: ${cache.useRedis ? 'Redis' : 'In-memory'}`);
      logger.info(`INFOODS: ${infoodsService.isAvailable() ? 'Available' : 'Not available'}`);
      logger.info(`USDA API: ${config.usda.apiKey ? 'Configured' : 'Not configured'}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

module.exports = app;
