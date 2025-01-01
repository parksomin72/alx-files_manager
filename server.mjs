import express from 'express';
import routes from './routes/index';

const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Attach routes
app.use('/', routes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
