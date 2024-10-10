import { Bucket } from '../models/Bucket';  // Subbucket yerine Bucket
import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { UploadedFile } from '../models/File';
import { Project } from '../models/Project';  // Bucket yerine Project

// Dosyaların kaydedileceği ana dizin
const UPLOADS_DIR = '/mnt/c/Users/avsro/Desktop/SPACES3';

// Bucket'e dosya yükleme
export const uploadFile = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Dosya yüklenemedi, lütfen bir dosya seçin.' });
  }

  const { bucketId, accessKey } = req.body;

  if (!bucketId || !accessKey) {
    return res.status(400).json({ message: 'Bucket ID veya accessKey gönderilmedi.' });
  }

  try {
    // Bucket'ı ID ile bul
    const bucket = await Bucket.findById(bucketId);
    if (!bucket) {
      return res.status(404).json({ message: 'Bucket bulunamadı.' });
    }

    // accessKey doğrulaması
    if (accessKey !== bucket.accessKey) {
      return res.status(403).json({ message: 'Erişim reddedildi: Geçersiz accessKey.' });
    }

    if (!bucket.path) {
      return res.status(400).json({ message: 'Bucket yol bilgisi tanımlı değil.' });
    }

    // Eğer `bucket.path` tam yolu içeriyorsa, `UPLOADS_DIR` ile birleştirmeden kullan
    const bucketDir = bucket.path;
    console.log("Klasör Yolu:", bucketDir);

    await fs.ensureDir(bucketDir);  // Bucket klasörü oluşturma

    // Dosyanın tam kaydedileceği yol
    const filePath = path.join(bucketDir, req.file.originalname);
    console.log("Dosyanın kaydedileceği yol:", filePath);

    // Dosyayı kaydetme
    try {
      await fs.writeFile(filePath, req.file.buffer);
    } catch (writeError) {
      console.error('Dosya yazılırken hata oluştu:', writeError);
      return res.status(500).json({ message: 'Dosya kaydedilemedi.' });
    }

    // Dosya bilgilerini MongoDB'ye kaydet
    const newFile = new UploadedFile({
      fileName: req.file.originalname,
      filePath,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      bucketId,
    });
    await newFile.save();

    res.status(200).json({ message: 'Dosya başarıyla yüklendi.', file: newFile });
  } catch (error) {
    console.error('Dosya yüklenirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosya yüklenirken bir hata oluştu.' });
  }
};

// Bucket'e ait dosyaları listeleme
export const listFilesByBucket = async (req: Request, res: Response) => {
  const { bucketId } = req.params;

  if (!bucketId) {
    return res.status(400).json({ message: 'Bucket ID gönderilmedi.' });
  }

  try {
    const files = await UploadedFile.find({ bucketId });
    if (files.length === 0) {
      return res.status(200).json({ message: 'Henüz yüklenmiş dosya yok.' });
    }
    const filesWithUrl = files.map((file) => ({
      ...file.toObject(),
      url: `http://localhost:8080/uploads/${file.fileName}`  // Dosya URL'si
    }));
    res.status(200).json({ files: filesWithUrl });
  } catch (error) {
    console.error('Dosya listelenirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosyalar listelenemedi.' }); 
  }
};

// Dosya silme
export const deleteFile = async (req: Request, res: Response) => {
  const { fileName, bucketId } = req.body;

  if (!fileName || !bucketId) {
    return res.status(400).json({ message: 'Dosya adı veya Bucket ID gönderilmedi.' });
  }

  try {
    const file = await UploadedFile.findOne({ fileName, bucketId });
    if (!file) {
      return res.status(404).json({ message: 'Dosya bulunamadı.' });
    }

    // Dosyayı dosya sisteminden sil
    await fs.remove(file.filePath);

    // Dosya kaydını MongoDB'den sil
    await UploadedFile.deleteOne({ _id: file._id }); // file.remove() yerine deleteOne() kullanıyoruz

    res.status(200).json({ message: 'Dosya başarıyla silindi.' });
  } catch (error) {
    console.error('Dosya silinirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosya silinemedi.' });
  }
};

