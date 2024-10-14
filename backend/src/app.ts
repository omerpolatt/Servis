import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/userRoutes';
import cors from 'cors';
import { authMiddleware } from './middlewares/AuthMiddlewares';
import bucketRoutes from './routes/bucketRoutes';
import projectRoutes  from './routes/projectRoutes';
import kullanicifileRoutes from './routes/KullanicifileRoutes';
import adminfileRoutes from './routes/AdminFileRoutes';
import path from 'path';

dotenv.config() // env dosyasını okumak için

connectDB()

const app = express();

app.use(cors({
    origin: ['http://localhost:5180' , 'http://localhost:5181' , 'http://127.0.0.1:5180/' ] 
  }));
app.use(express.json()); // JSON verilerini almak için

app.use('/', express.static('/mnt/c/Users/avsro/Desktop/SPACES3'));


app.use('/api/auth', authRoutes);  // Kimlik doğrulama rotalarını ekle
app.use('/api/files', authMiddleware , adminfileRoutes); // admin için file işlemleri 
app.use('/api/project',authMiddleware , projectRoutes )
app.use('/api/bucket', authMiddleware, bucketRoutes);
app.use('/', kullanicifileRoutes) // kullancıcı için file işlemleri



const PORT = process.env.PORT || 5050;

app.listen(PORT, () =>
    console.log(`Sunucu ${PORT} portunda başlatıldı.`)
);