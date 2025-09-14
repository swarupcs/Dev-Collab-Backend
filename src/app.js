import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';
import apiRouter from './routes/apiRoutes.js';


dotenv.config(); // Load env variables

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root route
app.get('/', (req, res) => {
  res.send('✅ Test from Hello World');
});

app.use('/api', apiRouter);

// Start server
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDB(); // Connect DB before starting server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}...`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
