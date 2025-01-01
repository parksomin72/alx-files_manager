/* eslint-disable import/no-named-as-default */
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

export default class AuthController {
  /**
   * Logs in a user and generates an authentication token.
   * @param {Object} req - The request object containing user information.
   * @param {Object} res - The response object to send the token.
   */
  static async getConnect(req, res) {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const token = uuidv4();
      const tokenTTL = 24 * 60 * 60;

      await redisClient.set(`auth_${token}`, user._id.toString(), tokenTTL);
      return res.status(200).json({ token });
    } catch (error) {
      console.error('Error in getConnect:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Logs out a user by invalidating their authentication token.
   * @param {Object} req - The request object containing the token.
   * @param {Object} res - The response object to confirm the logout.
   */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    try {
      const deleted = await redisClient.del(`auth_${token}`);
      if (deleted === 0) {
        return res.status(404).json({ error: 'Token not found' });
      }
      return res.status(204).send();
    } catch (error) {
      console.error('Error in getDisconnect:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
