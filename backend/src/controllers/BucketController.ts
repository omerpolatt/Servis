import { Bucket } from '../models/Bucket';  // Subbucket yerine Bucket oldu
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import path from 'path';
import { Project } from '../models/Project';  // Bucket yerine Project oldu
import User from '../models/Users';  // Kullanıcı modeli
import mongoose from 'mongoose';
import { UploadedFile } from '../models/File';

// Bucket (alt klasör) oluşturma fonksiyonu
export const createBucket = async (req: Request, res: Response) => {
  const { bucketName, projectId } = req.body;  // Alt klasör adı ve proje ID'si
  const token = req.header('Authorization')?.split(' ')[1]; // Kullanıcı token'ı

  if (!bucketName || !projectId || !token) {
    return res.status(400).json({ message: 'Bucket adı, proje ID ve token gereklidir.' });
  }

  try {
    // Kullanıcı token'ını doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Proje ID'si ile projeyi bul
    const parentProject = await Project.findOne({ _id: projectId, owner: user._id });
    if (!parentProject) {
      return res.status(404).json({ message: 'Proje bulunamadı ya da yetkiniz yok.' });
    }

    // `parentProject.path` kontrolü
    if (!parentProject.path) {
      return res.status(400).json({ message: 'Proje yol bilgisi eksik.' });
    }

    // Aynı isimde bir bucket var mı kontrol et
    const existingBucket = await Bucket.findOne({ bucketName, projectId: parentProject._id });
    if (existingBucket) {
      return res.status(400).json({ message: 'Bu isimde bir bucket zaten mevcut.' });
    }

    // **accessKey'i oluştur**
    const bucketAccessKey = jwt.sign(
      { bucketName },
      process.env.JWT_SECRET_KEY || 'default_secret_key',
      { expiresIn: '7d' }
    );

    // Bucket için dosya sisteminde yol oluştur
    const bucketPath = path.join(parentProject.path, bucketName);

    // Dosya sisteminde bucket oluştur
    await fs.ensureDir(bucketPath);

    // Yeni bucket modelini oluştur (accessKey'i dahil ederek)
    const newBucket = new Bucket({
      bucketName: bucketName,
      accessKey: bucketAccessKey,  // **accessKey burada ekleniyor**
      projectId: parentProject._id, // Projeye bağlı bucket
      path: bucketPath,
    });

    // Yeni bucket'ı veritabanına kaydet
    await newBucket.save();

    // Projenin bucket listesine bu bucket'ı ekle
    parentProject.bucket.push({
      bucketId: newBucket._id as mongoose.Types.ObjectId,
      bucketName: newBucket.bucketName
    });

    // Projeyi güncelle ve kaydet
    await parentProject.save();

    return res.status(201).json({
      message: 'Bucket başarıyla oluşturuldu ve proje alt bucket listesine eklendi.',
      bucket: newBucket,
      folderPath: bucketPath,
      bucketAccessKey,  // accessKey frontend'e de gönderiliyor
    });
  } catch (error) {
    if (typeof error === 'object' && (error as any).name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token.' });
    }
    console.error('Bucket oluşturulurken hata oluştu:', error);
    return res.status(500).json({ message: 'Bucket oluşturulurken bir hata oluştu.' });
  }
};

// Bucket'ları listeleme fonksiyonu
export const listBuckets = async (req: Request, res: Response) => {
  const { parentProjectId } = req.params;  // URL parametresinden Ana Proje ID'sini alıyoruz
  const authHeader = req.header('Authorization');
  const token = authHeader?.split(' ')[1];  // Token'ı Authorization header'ından alıyoruz

  // Eksik parametre kontrolü
  if (!parentProjectId) {
    return res.status(400).json({ message: 'Ana proje ID gereklidir.' });
  }

  if (!token) {
    return res.status(400).json({ message: 'Token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Kullanıcının sahip olduğu ana projeyi doğrula
    const parentProject = await Project.findOne({ _id: parentProjectId, owner: user._id });
    if (!parentProject) {
      return res.status(404).json({ message: 'Ana proje bulunamadı ya da bu projeye erişim yetkiniz yok.' });
    }

    // Bucket'ları listele ve sadece gerekli alanları seç
    const buckets = await Bucket.find({ projectId: parentProject._id })
      .select('bucketName accessKey projectId path');  // İstediğiniz alanları seçin (ör. bucketName)

    // Eğer bucket yoksa boş bir array döndürelim, 404 değil
    if (!buckets.length) {
      return res.status(200).json({ message: 'Bu projeye ait bucket bulunamadı.', buckets: [] });
    }

    // Başarılı durumda bucket listesi döndür
    return res.status(200).json({ buckets });

  } catch (error) {
    // Hata durumunda loglama ve detaylı hata mesajı döndürme
    console.error('Bucket\'lar listelenirken hata oluştu:', error);
    
    // JWT doğrulama hatası kontrolü
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }

    // Diğer hatalar için genel hata mesajı
    return res.status(500).json({ message: 'Bucket\'lar listelenirken bir hata oluştu.' });
  }
};

// Bucket (alt klasör) silme fonksiyonu
export const deleteBucket = async (req: Request, res: Response) => {
  const { id } = req.params;
  const authHeader = req.header('Authorization');
  const token = authHeader ? authHeader.split(' ')[1] : null;

  // Eksik parametre kontrolü
  if (!id) {
    return res.status(400).json({ message: 'Bucket ID gereklidir.' });
  }

  if (!token) {
    return res.status(400).json({ message: 'Token gereklidir.' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    const bucket = await Bucket.findById(id);
    if (!bucket) {
      return res.status(404).json({ message: 'Bucket bulunamadı.' });
    }

    const project = await Project.findOne({ _id: bucket.projectId, owner: user._id });
    if (!project) {
      return res.status(404).json({ message: 'Yetkiniz yok veya ana proje bulunamadı.' });
    }

    // Bucket'a ait dosyaları bul
    const files = await UploadedFile.find({ accessKey: bucket.accessKey });

    // Her bir dosyayı sil
    for (const file of files) {
      // Dosya sistemindeki dosyayı sil
      if (fs.existsSync(file.filePath)) {
        await fs.remove(file.filePath);
      }

      // Veritabanından dosya kaydını sil
      await UploadedFile.findByIdAndDelete(file._id);
    }

    // Dosya sistemindeki bucket'ı sil
    await fs.remove(bucket.path);

    // Veritabanından bucket'ı sil
    await Bucket.findByIdAndDelete(id);

    // İlgili projenin buckets alanından bucket'ı sil
    await Project.updateOne({ _id: bucket.projectId }, { $pull: { buckets: { _id: id } } });

    return res.status(200).json({ message: 'Bucket ve ilgili dosyalar başarıyla silindi.' });
  } catch (error) {
    console.error('Bucket silme hatası:', error);
    return res.status(500).json({ message: 'Bucket silme işlemi sırasında hata oluştu.' });
  }
};


