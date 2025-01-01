/* eslint-disable import/no-named-as-default */
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class AppController {
  /**
   * Get the status of Redis and MongoDB.
   */
  static getStatus(req, res) {
    try {
      res.status(200).json({
        redis: redisClient.isAlive(),
        db: dbClient.isAlive(),
      });
    } catch (error) {
      console.error('Error in getStatus:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Get statistics of users and files in the database.
   */
  static async getStats(req, res) {
    try {
      const [usersCount, filesCount] = await Promise.all([
        dbClient.nbUsers(),
        dbClient.nbFiles(),
      ]);

      res.status(200).json({
        users: usersCount,
        files: filesCount,
      });
    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

