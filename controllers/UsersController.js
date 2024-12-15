import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  /**
   * POST /users
   * Creates a new user in the database.
   */
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Validate email and password presence
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const usersCollection = dbClient.database.collection('users');

      // Check if the email already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Hash the password using SHA1
      const hashedPassword = sha1(password);

      // Insert the new user into the database
      const result = await usersCollection.insertOne({ email, password: hashedPassword });

      // Return the new user with only email and id
      return res.status(201).json({ id: result.insertedId.toString(), email });
    } catch (err) {
      console.error(`Error creating new user: ${err}`);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default UsersController;
