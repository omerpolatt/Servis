import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';  // Benzersiz erişim anahtarı oluşturmak için
import User from '../models/Users';  // Eğer default export ise bu şekilde kullanılır.
import { Bucket } from '../models/Bucket';
import fs from 'fs-extra';
import path from 'path';

export const createBucket = async (req: Request, res: Response) => {
  const { bucketName } = req.body;
  const token = req.header('Authorization')?.split(' ')[1];  // Kullanıcı token'ı
  
  if (!bucketName || !token) {
    return res.status(400).json({ message: 'Bucket name ve token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };
    
    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Aynı kullanıcıya ait aynı isimde bir bucket olup olmadığını kontrol et
    const existingBucket = await Bucket.findOne({ bucketName, owner: user._id });
    if (existingBucket) {
      return res.status(400).json({ message: 'Bu isimde bir bucket zaten mevcut.' });
    }

    // Güvenli bir bucket adı oluştur (boşlukları ve özel karakterleri temizle)
    const sanitizedBucketName = bucketName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

    // Benzersiz bir access key oluştur
    const accessKey = crypto.randomBytes(16).toString('hex');  // Rastgele 16 baytlık bir anahtar

    // Yeni bucket oluştur
    const newBucket = new Bucket({
      bucketName: sanitizedBucketName,
      owner: user._id,
      accessKey: accessKey,  // Benzersiz access key
    });
    await newBucket.save();

   // Kullanıcının bucket'larına ekle
    user.buckets.push({
    bucketId: newBucket._id as mongoose.Types.ObjectId,
    bucketName: newBucket.bucketName
  });
  await user.save();

    // Kullanıcı ID'sini kullanarak dosya sisteminde bucket klasörü oluştur
    const bucketPath = path.join('/mnt/c/Users/avsro/Desktop/SPACES3', `${sanitizedBucketName}`);
    
    // Klasör yoksa oluştur (fs-extra ile klasör oluşturma)
    await fs.ensureDir(bucketPath);

    return res.status(200).json({ message: 'Bucket başarıyla oluşturuldu.', bucket: newBucket });
  } catch (error) {
    if (typeof error === 'object' && (error as any).name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token.' });
    }

    console.error('Bucket oluşturulurken hata:', error);
    return res.status(500).json({ message: 'Bucket oluşturulurken bir hata oluştu.' });
  }
};
