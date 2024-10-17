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
  try {
    const { accessKey } = req.params;

    if (!accessKey) {
      console.log("Access Key gönderilmedi.");
      return res.status(400).json({ message: 'Access Key gönderilmedi.' });
    }

    // UploadedFile sorgusunun sonucunu kontrol et
    const files = await UploadedFile.find({ accessKey });
    

    if (files.length === 0) {
      return res.status(200).json({ message: 'Henüz yüklenmiş dosya yok.' });
    }

    // Dosya bilgilerini URL ile birlikte döndürüyoruz
    const filesWithUrl = files.map((file) => {
      const relativePath = file.filePath.split('SPACES3/')[1];
      console.log("Relative Path:", relativePath);
    
      // Tüm path'i encode ederken '/' karakterini tekrar yerine koyun
      const encodedPath = relativePath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
    
      return {
        ...file.toObject(),
        url: `https://22733193f73a552a32a65fa05e5daf40.serveo.net/uploads/${encodedPath}`,
      };
    });
    
    console.log("Files with URL:", filesWithUrl);

    return res.status(200).json({ files: filesWithUrl });
  } catch (error) {
    console.error('Error in listFilesByAccessKey function:', error);
    return res.status(500).json({ message: 'Dosyalar listelenemedi.' });
}
};

export const deleteFileByAccessKey = async (req: Request, res: Response) => {
  const { accessKey, fileId } = req.params;

  if (!accessKey || !fileId) {
    return res.status(400).json({ message: 'Access Key veya dosya ID gönderilmedi.' });
  }

  try {
    // 1. Veritabanında dosyayı bul
    const file = await UploadedFile.findOne({ _id: fileId, accessKey });
    if (!file) {
      return res.status(404).json({ message: 'Dosya veritabanında bulunamadı.' });
    }

    // 2. Dosya yolunu al ve logla
    const filePath = file.filePath;
    console.log('Silinecek dosyanın dosya yolu:', filePath); // Dosya yolunu yazdır

    // 3. Dosya sisteminde olup olmadığını kontrol et
    if (!fs.existsSync(filePath)) {
      console.error('Dosya sisteminde bulunamadı:', filePath);
      return res.status(404).json({ message: 'Dosya dosya sisteminde bulunamadı.' });
    }

    // 4. Dosyayı dosya sisteminden sil
    fs.unlink(filePath, async (err) => {
      if (err) {
        console.error('Dosya sisteminden silinirken hata oluştu:', err);
        return res.status(500).json({ message: 'Dosya sisteminden silinirken hata oluştu.' });
      }

      console.log('Dosya başarıyla dosya sisteminden silindi.');

      // 5. Dosyayı veritabanından sil
      try {
        await UploadedFile.deleteOne({ _id: fileId });
        console.log('Dosya kaydı veritabanından başarıyla silindi.');
        return res.status(200).json({ message: 'Dosya başarıyla silindi.' });
      } catch (dbErr) {
        console.error('Veritabanından silinirken hata oluştu:', dbErr);
        return res.status(500).json({ message: 'Veritabanından silinirken hata oluştu.' });
      }
    });
  } catch (error) {
    console.error('Dosya silinirken hata oluştu:', error);
    return res.status(500).json({ message: 'Dosya silinirken bir hata oluştu.' });
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
