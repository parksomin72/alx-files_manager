import { MongoClient } from 'mongodb';

class DBClient {
    constructor() {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';
        const uri = `mongodb://${host}:${port}`;

        this.client = new MongoClient(uri, { useUnifiedTopology: true });
        this.database = null;

        this.client.connect()
            .then(() => {
                this.database = this.client.db(database);
                console.log('MongoDB client connected');
            })
            .catch((error) => {
                console.error(`MongoDB Client Error: ${error.message}`);
            });
    }

    isAlive() {
        return this.client && this.client.isConnected();
    }

    async nbUsers() {
        try {
            return await this.database.collection('users').countDocuments();
        } catch (error) {
            console.error(`Error fetching number of users: ${error.message}`);
            return 0;
        }
    }


    async nbFiles() {
        try {
            return await this.database.collection('files').countDocuments();
        } catch (error) {
            console.error(`Error fetching number of files: ${error.message}`);
            return 0;
        }
    }


    async addUser(email, password) {
        try {
            const user = await this.database.collection('users').findOne({ email });
            if (user) {
                throw new Error('Already exist');
            }
            const result = await this.database.collection('users').insertOne({ email, password });
            return result.ops[0];
        } catch (error) {
            console.error(`Error adding user: ${error.message}`);
            throw error;
        }
    }
}


const dbClient = new DBClient();
export default dbClient;
