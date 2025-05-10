import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import entriesRoutes from './routes/entries.js';

dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/entries', entriesRoutes);

// MongoDB connection
mongoose.connect(process.env.VITE_MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
