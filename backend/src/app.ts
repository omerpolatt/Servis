import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';

dotenv.config() // env dosyasını okumak için

connectDB()

const app = express();

app.use(express.json()); // JSON verilerini almak için

app.use('/api/auth', authRoutes);  // Kimlik doğrulama rotalarını ekle



const PORT = process.env.PORT || 5050;

app.listen(PORT, () =>
    console.log(`Sunucu ${PORT} portunda başlatıldı.`)
);