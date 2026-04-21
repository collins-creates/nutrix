require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  usda: {
    apiKey: process.env.USDA_API_KEY,
    baseUrl: process.env.USDA_BASE_URL || 'https://api.nal.usda.gov/fdc/v1'
  },
  
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },
  
  cache: {
    ttl: parseInt(process.env.CACHE_TTL_SECONDS) || 3600,
    searchTtl: parseInt(process.env.SEARCH_CACHE_TTL_SECONDS) || 1800
  }
};
