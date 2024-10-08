import { Subbucket } from '../models/Bucket';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import path from 'path';
import { Bucket } from '../models/Project';
import User from '../models/Users';  // Kullanıcı modeli
import mongoose from 'mongoose';

// Alt klasör oluşturma fonksiyonu
export const createSubbucket = async (req: Request, res: Response) => {
  const { subFolderName, parentBucketAccessKey } = req.body;
  const token = req.header('Authorization')?.split(' ')[1]; // Kullanıcı token'ı

  if (!subFolderName || !parentBucketAccessKey || !token) {
    return res.status(400).json({ message: 'Alt klasör adı, ana bucket access key ve token gereklidir.' });
  }

  try {
    // Kullanıcı token'ını doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Ana bucket'ı accessKey ile bul
    const parentBucket = await Bucket.findOne({ accessKey: parentBucketAccessKey, owner: user._id });

    if (!parentBucket) {
      return res.status(404).json({ message: 'Ana bucket bulunamadı ya da yetkiniz yok.' });
    }

    // `parentBucket.path` kontrolü
    if (!parentBucket.path) {
      return res.status(400).json({ message: 'Ana bucket yol bilgisi eksik.' });
    }

    // Aynı isimde bir alt klasör var mı kontrol et
    const existingSubbucket = await Subbucket.findOne({ subFolderName, bucketId: parentBucket._id });
    if (existingSubbucket) {
      return res.status(400).json({ message: 'Bu isimde bir alt klasör zaten mevcut.' });
    }

    // Alt klasör için accessKey oluştur
    const subbucketAccessKey = jwt.sign(
      { subFolderName },
      process.env.JWT_SECRET_KEY || 'default_secret_key',
      { expiresIn: '7d' }
    );

    // Alt klasör için dosya sisteminde yol oluştur
    const subbucketPath = path.join(parentBucket.path, subFolderName);

    // Dosya sisteminde alt klasörü oluştur
    await fs.ensureDir(subbucketPath);
    console.log(`Alt klasör başarıyla oluşturuldu: ${subbucketPath}`);

    // Yeni alt klasör modelini oluştur
    const newSubbucket = new Subbucket({
      subFolderName,
      accessKey: subbucketAccessKey,
      bucketId: parentBucket._id,
      path: subbucketPath,
    });

    // Yeni alt klasörü veritabanına kaydet
    await newSubbucket.save();

    // Bucket'ın subfolders alanına alt klasör ID ve ismi ile ekle
    parentBucket.subfolders.push({
      subFolderId: newSubbucket._id as mongoose.Types.ObjectId,
      subFolderName: newSubbucket.subFolderName
    });

    // Bucket'ı güncelle ve kaydet
    await parentBucket.save();

    return res.status(201).json({
      message: 'Alt klasör başarıyla oluşturuldu ve bucket alt klasör listesine eklendi.',
      subbucket: newSubbucket,
      folderPath: subbucketPath,
      subbucketAccessKey,
    });
  } catch (error) {
    if (typeof error === 'object' && (error as any).name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token.' });
    }
    console.error('Alt klasör oluşturulurken hata oluştu:', error);
    return res.status(500).json({ message: 'Alt klasör oluşturulurken bir hata oluştu.' });
  }
};


export const listSubbuckets = async (req: Request, res: Response) => {
  const { parentBucketId } = req.params;
  const token = req.header('Authorization')?.split(' ')[1]; // Kullanıcı token'ı

  if (!parentBucketId || !token) {
    return res.status(400).json({ message: 'Ana bucket ID ve token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Kullanıcının sahip olduğu ana bucket'ı doğrula
    const parentBucket = await Bucket.findOne({ _id: parentBucketId, owner: user._id });
    if (!parentBucket) {
      return res.status(404).json({ message: 'Ana bucket bulunamadı ya da yetkiniz yok.' });
    }

    // Subbucket'ları listele
    const subbuckets = await Subbucket.find({ bucketId: parentBucket._id });
    return res.status(200).json({ subbuckets });
  } catch (error) {
    console.error('Subbucket\'lar listelenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Subbucket\'lar listelenirken bir hata oluştu.' });
  }
};