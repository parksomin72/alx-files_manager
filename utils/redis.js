import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

this.client.on('error', (err) => {
      console.error(`Redis client not connected to the server: ${err.message}`);
    });
  }

  /**
   * Checks if the Redis client is alive.
   * @returns {boolean} - True if connected, else false.
   */
  isAlive() {
    return this.client.connected;
  }

  /**
   * Gets the value of a key from Redis.
   * @param {string} key - The key to retrieve.
   * @returns {Promise<string | null>} - The value associated with the key or null if not found.
   */
  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    try {
      return await getAsync(key);
    } catch (err) {
      console.error(`Error getting key ${key}: ${err.message}`);
      return null;
    }
  }

  /**
   * Sets a value in Redis with an expiration time.
   * @param {string} key - The key to set.
   * @param {string} value - The value to store.
   * @param {number} duration - Expiration time in seconds.
   */
  async set(key, value, duration) {
    const setAsync = promisify(this.client.set).bind(this.client);
    try {
      await setAsync(key, value, 'EX', duration);
    } catch (err) {
      console.error(`Error setting key ${key}: ${err.message}`);
    }
  }

  /**
   * Deletes a key from Redis.
   * @param {string} key - The key to delete.
   */
  async del(key) {
    const delAsync = promisify(this.client.del).bind(this.client);
    try {
      await delAsync(key);
    } catch (err) {
      console.error(`Error deleting key ${key}: ${err.message}`);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
