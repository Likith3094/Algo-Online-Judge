const Redis = require('ioredis');

// Connect to Redis instance (defaults to localhost:6379 if REDIS_URL is not set)
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redisConnection;
