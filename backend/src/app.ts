import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/userRoutes';
import cors from 'cors';
import fileRoutes from './routes/fileRoutes';
import { authMiddleware } from './middlewares/AuthMiddlewares';
import bucketRoutes from './routes/bucketRoutes';
import projectRoutes  from './routes/projectRoutes';


dotenv.config() // env dosyasını okumak için

connectDB()

const app = express();
app.use(cors({
    origin: ['http://localhost:5180' , 'http://localhost:5181' , 'http://127.0.0.1:5180/'] 
  }));
app.use(express.json()); // JSON verilerini almak için

app.use('/api/auth', authRoutes);  // Kimlik doğrulama rotalarını ekle
app.use('/api/files', authMiddleware , fileRoutes);
app.use('/api/project',authMiddleware , projectRoutes )
app.use('/api/bucket', authMiddleware, bucketRoutes);




const PORT = process.env.PORT || 5050;

app.listen(PORT, () =>
    console.log(`Sunucu ${PORT} portunda başlatıldı.`)
);