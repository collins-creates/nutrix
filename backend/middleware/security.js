const rateLimit = require('express-rate-limit');
const config = require('../config/config');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

const generalLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.maxRequests,
  'Too many requests from this IP, please try again later.'
);

const searchLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  30, // 30 requests per minute
  'Too many search requests, please try again later.'
);

const autocompleteLimiter = createRateLimiter(
  60 * 1000, // 1 minute  
  60, // 60 requests per minute
  'Too many autocomplete requests, please try again later.'
);

module.exports = {
  generalLimiter,
  searchLimiter,
  autocompleteLimiter
};
