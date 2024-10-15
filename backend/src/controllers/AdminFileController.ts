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
    console.log("Received Access Key:", accessKey);

    if (!accessKey) {
      console.log("Access Key gönderilmedi.");
      return res.status(400).json({ message: 'Access Key gönderilmedi.' });
    }

    // UploadedFile sorgusunun sonucunu kontrol et
    const files = await UploadedFile.find({ accessKey });
    console.log("Files fetched from database:", files);

    if (files.length === 0) {
      console.log("No files found for the given access key.");
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
        url: `https://95a886193a8110f067168394d722b087.serveo.net/uploads/${encodedPath}`,
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
  const { accessKey, fileId } = req.params;  // Parametre olarak accessKey ve fileId alıyoruz

  if (!accessKey || !fileId) {
    return res.status(400).json({ message: 'Access Key veya dosya ID gönderilmedi.' });
  }

  try {
    // accessKey ve fileId ile dosyayı buluyoruz
    const file = await UploadedFile.findOne({ _id: fileId, accessKey });
    
    if (!file) {
      return res.status(404).json({ message: 'Dosya bulunamadı.' });
    }

    // Dosyanın dosya sistemindeki yolunu kontrol edip, silme işlemi yapıyoruz
    if (await fs.pathExists(file.filePath)) {
      await fs.remove(file.filePath);  // Dosyayı dosya sisteminden sil
    } else {
      return res.status(404).json({ message: 'Dosya dosya sisteminde bulunamadı.' });
    }

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
