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

export const deleteBucket = async (req: Request, res: Response) => {
  const { bucketId } = req.params;
  const token = req.header('Authorization')?.split(' ')[1];  // Kullanıcı token'ı

  if (!bucketId || !token) {
    return res.status(400).json({ message: 'Bucket ID ve token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Silinmek istenen bucket'ı bul
    const bucket = await Bucket.findOne({ _id: bucketId, owner: user._id });
    if (!bucket) {
      return res.status(404).json({ message: 'Bucket bulunamadı ya da yetkiniz yok.' });
    }

    // Kullanıcının buckets listesinden bu bucket'ı çıkar
    user.buckets = user.buckets.filter(b => b.bucketId.toString() !== bucketId);
    await user.save();

    // Dosya sistemindeki bucket yolunu sil
    const bucketPath = bucket.path;
    if (fs.existsSync(bucketPath)) {
      await fs.remove(bucketPath);  // Dosya sisteminden klasörü sil
    }

    // Bucket'ı veritabanından sil
    await Bucket.findByIdAndDelete(bucketId);  // remove() yerine findByIdAndDelete() kullanıyoruz

    return res.status(200).json({ message: 'Bucket başarıyla silindi.' });
  } catch (error) {
    console.error('Bucket silinirken hata oluştu:', error);
    return res.status(500).json({ message: 'Bucket silinirken bir hata oluştu.' });
  }
};

export const updateBucketName = async (req: Request, res: Response) => {
  const { bucketId } = req.params;
  const { newBucketName } = req.body;  // Yeni bucket adı
  const token = req.header('Authorization')?.split(' ')[1];  // Kullanıcı token'ı

  if (!bucketId || !newBucketName || !token) {
    return res.status(400).json({ message: 'Bucket ID, yeni bucket adı ve token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Mevcut bucket'ı bul
    const bucket = await Bucket.findOne({ _id: bucketId, owner: user._id });
    if (!bucket) {
      return res.status(404).json({ message: 'Bucket bulunamadı ya da yetkiniz yok.' });
    }

    // Eski bucket yolunu al
    const oldBucketPath = bucket.path;

    // Yeni bucket adını dosya sistemine uygun hale getir (boşlukları temizle)
    const sanitizedNewBucketName = newBucketName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

    // Yeni bucket yolunu oluştur
    const newBucketPath = path.join(path.dirname(oldBucketPath), sanitizedNewBucketName);

    // Dosya sisteminde klasör adını değiştir
    if (fs.existsSync(oldBucketPath)) {
      await fs.rename(oldBucketPath, newBucketPath);  // Klasör adını değiştiriyoruz
    }

    // Veritabanında bucket adını ve yolunu güncelle
    bucket.bucketName = sanitizedNewBucketName;
    bucket.path = newBucketPath;
    await bucket.save();

    // Kullanıcıya ait bucket listesindeki bucket adını da güncelle
    user.buckets = user.buckets.map(b => {
      if (b.bucketId.toString() === bucketId) {
        return { bucketId: b.bucketId, bucketName: sanitizedNewBucketName };
      }
      return b;
    });
    await user.save();

    return res.status(200).json({ message: 'Bucket adı başarıyla güncellendi.' });
  } catch (error) {
    console.error('Bucket adı güncellenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Bucket adı güncellenirken bir hata oluştu.' });
  }
};

export const listUserBuckets = async (req: Request, res: Response) => {
  const token = req.header('Authorization')?.split(' ')[1];  // Kullanıcı token'ı

  if (!token) {
    return res.status(400).json({ message: 'Token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email })
      .populate({
        path: 'buckets.bucketId',  // bucketId alanını populate et
        model: 'Bucket',  // Bucket modelinden alıyoruz
        select: 'bucketName _id'  // Sadece bucketName ve _id alanlarını alıyoruz
      });

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Kullanıcının buckets alanını döndür
    const userBuckets = user.buckets.map((bucket: any) => ({
      bucketId: bucket.bucketId._id,
      bucketName: bucket.bucketId.bucketName,
    }));

    return res.status(200).json({ buckets: userBuckets });
  } catch (error) {
    console.error('Kullanıcının bucket\'ları listelenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Bucket\'lar listelenirken bir hata oluştu.' });
  }
};