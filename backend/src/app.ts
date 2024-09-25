import express from 'express';
import dotenv from 'dotenv';

dotenv.config() // env dosyasını okumak için


const app = express();


const PORT = process.env.PORT || 5050;

app.listen(PORT, () =>
    console.log(`Sunucu ${PORT} portunda başlatıldı.`)
  );