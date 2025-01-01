/* eslint-disable import/no-named-as-default */
import bcrypt from 'bcrypt';
import Queue from 'bull/lib/queue';
import dbClient from '../utils/db';
import validator from 'validator';

const userQueue = new Queue('email sending');

export default class UsersController {
  static async postNew(req, res) {
    const email = req.body?.email || null;
    const password = req.body?.password || null;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
      const usersCollection = await dbClient.usersCollection();
      const user = await usersCollection.findOne({ email });

      if (user) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertionInfo = await usersCollection.insertOne({
        email,
        password: hashedPassword,
      });

      const userId = insertionInfo.insertedId.toString();

      await userQueue.add({ userId });

      return res.status(201).json({ email, id: userId });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    const { user } = req;

    try {
      return res.status(200).json({
        email: user.email,
        id: user._id.toString(),
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
