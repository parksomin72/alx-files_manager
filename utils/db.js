import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
        this.usersCollection = this.db.collection('users');
      })
      .catch((err) => console.error('MongoDB connection error:', err));
  }

  isAlive() {
    return this.client && this.client.isConnected();
  }

  async nbUsers() {
    return this.usersCollection.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
