import { Bucket } from '../models/Bucket';
import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { UploadedFile } from '../models/File';

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

    const bucketDir = bucket.path;

    await fs.ensureDir(bucketDir);  // Bucket klasörü oluşturma

    // Dosyanın tam kaydedileceği yol
    const filePath = path.join(bucketDir, req.file.originalname);

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
      bucketId: bucket._id, // bucketId'yi kaydediyoruz
    });
    
    await newFile.save();

    res.status(200).json({ message: 'Dosya başarıyla yüklendi.', file: newFile });
  } catch (error) {
    console.error('Dosya yüklenirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosya yüklenirken bir hata oluştu.' });
  }
};


export const listFilesByAccessKey = async (req: Request, res: Response) => {
  const { accessKey } = req.params;  // accessKey'yi parametre olarak alıyoruz

  if (!accessKey) {
    return res.status(400).json({ message: 'Access Key gönderilmedi.' });
  }

  try {
    // accessKey ile UploadedFile'ları buluyoruz
    const files = await UploadedFile.find({ accessKey });
    
    if (files.length === 0) {
      return res.status(200).json({ message: 'Henüz yüklenmiş dosya yok.' });
    }

    // Dosya bilgilerini URL ile birlikte döndürüyoruz
    const filesWithUrl = files.map((file) => ({
      ...file.toObject(),
      url: `http://localhost:8080/uploads/${file.fileName}`,  // Dosya URL'si
    }));

    // Dosyaları JSON formatında geri döndürüyoruz
    return res.status(200).json({ files: filesWithUrl });

  } catch (error) {
    console.error('Dosyalar listelenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Dosyalar listelenemedi.' });
  }
};


export const deleteFileByAccessKey = async (req: Request, res: Response) => {
  const { accessKey, fileId } = req.body;

  if (!accessKey || !fileId) {
    return res.status(400).json({ message: 'Access Key veya dosya ID gönderilmedi.' });
  }

  try {
    // Access key ile bucket bul
    const bucket = await Bucket.findOne({ accessKey });
    if (!bucket) {
      return res.status(404).json({ message: 'Geçersiz access key veya bucket bulunamadı.' });
    }

    // fileId ve bucketId ile dosyayı bul
    const file = await UploadedFile.findOne({ _id: fileId, bucketId: bucket._id });
    if (!file) {
      return res.status(404).json({ message: 'Dosya bulunamadı.' });
    }

    // Dosyayı dosya sisteminden sil
    await fs.remove(file.filePath);

    // Dosya kaydını MongoDB'den sil
    await UploadedFile.deleteOne({ _id: file._id });

    res.status(200).json({ message: 'Dosya başarıyla silindi.' });
  } catch (error) {
    console.error('Dosya silinirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosya silinemedi.' });
  }
};

// Bucket ID ile accessKey'yi almak için endpoint
export const getAccessKeyByBucketId = async (req: Request, res: Response) => {
  const { bucketId } = req.params;

  try {
    const bucket = await Bucket.findById(bucketId);
    if (!bucket) {
      return res.status(404).json({ message: 'Bucket bulunamadı.' });
    }

    return res.status(200).json({ accessKey: bucket.accessKey });
  } catch (error) {
    console.error('AccessKey alınırken hata oluştu:', error);
    res.status(500).json({ message: 'AccessKey alınırken bir hata oluştu.' });
  }
};
