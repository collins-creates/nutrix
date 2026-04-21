const redis = require('redis');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheManager {
  constructor() {
    this.redisClient = null;
    this.fallbackCache = new NodeCache({ stdTTL: 3600 });
    this.useRedis = false;
  }

  async initialize() {
    try {
      if (process.env.REDIS_HOST) {
        this.redisClient = redis.createClient({
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_DB || 0
        });

        this.redisClient.on('error', (err) => {
          logger.warn('Redis connection error, falling back to memory cache:', err);
          this.useRedis = false;
        });

        this.redisClient.on('connect', () => {
          logger.info('Connected to Redis');
          this.useRedis = true;
        });

        await this.redisClient.connect();
      }
    } catch (error) {
      logger.warn('Redis initialization failed, using memory cache:', error);
      this.useRedis = false;
    }
  }

  async get(key) {
    try {
      if (this.useRedis && this.redisClient) {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      }
      return this.fallbackCache.get(key);
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      } else {
        this.fallbackCache.set(key, value, ttlSeconds);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async del(key) {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.fallbackCache.del(key);
      }
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async clear() {
    try {
      if (this.useRedis && this.redisClient) {
        await this.redisClient.flushDb();
      } else {
        this.fallbackCache.flushAll();
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }
}

module.exports = new CacheManager();
