import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { UploadedFile } from '../models/File';
import { Bucket } from '../models/Bucket';

const UPLOADS_DIR = '/mnt/c/Users/avsro/Desktop/SPACES3';

export const uploadFile = async (req: Request, res: Response) => {
  const { project, bucket, accessKey } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'Dosya yüklenemedi, lütfen bir dosya seçin.' });
  }

  if (!bucket || !project || !accessKey) {
    return res.status(400).json({ message: 'Bucket adı, Proje adı veya accessKey eksik.' });
  }

  try {
    const bucketkont = await Bucket.findOne({ bucketName:bucket , accessKey });
    if (!bucketkont) {
      return res.status(403).json({ message: 'Alt klasör bulunamadı veya erişim yetkiniz yok.' });
    }

    const folderPath = path.join(UPLOADS_DIR, project , bucket);
    await fs.ensureDir(folderPath);

    const filePath = path.join(folderPath, req.file.originalname);
    await fs.writeFile(filePath, req.file.buffer);

    // Dosya bilgilerini veritabanına kaydet
    const fileData = new UploadedFile({
      fileName: req.file.originalname,
      filePath: filePath,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      accessKey: bucketkont.accessKey,
      uploadedAt: new Date(),
    });
    await fileData.save();

    res.status(200).json({ message: 'Dosya başarıyla yüklendi ve veritabanına kaydedildi.', filePath });
  } catch (error) {
    console.error('Dosya yüklenirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosya yüklenirken bir hata oluştu.' });
  }
};

// Alt bucket'e ait dosyaları listeleme
export const listFilesBySubBucket = async (req: Request, res: Response) => {
  const { accessKey, projectName, bucketName } = req.params;

  console.log(accessKey, projectName, bucketName)

  if (!accessKey || !projectName || !bucketName) {
    return res.status(400).json({ message: 'Access key, bucket adı veya proje adı gönderilmedi.' });
  }
  
  try {
   
    const bucketkont = await Bucket.findOne({ accessKey, bucketName: bucketName });

    if (!bucketkont) {
      return res.status(404).json({ message: 'Alt klasör bulunamadı veya erişim yetkiniz yok.' });
    }

    // accessKey kullanarak ilgili dosyaları bul
    const files = await UploadedFile.find({ accessKey });
    if (files.length === 0) {
      return res.status(200).json({ message: 'Henüz yüklenmiş dosya yok.' });
    }


  } catch (error) {
    console.error('Dosya listelenirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosyalar listelenemedi.' });
}
};

// Dosya ID'sine göre dosya silme işlemi
export const deleteFileById = async (req: Request, res: Response) => {
  const { fileId, accessKey } = req.params;

  if (!fileId || !accessKey) {
    return res.status(400).json({ message: 'Dosya ID ve access key gereklidir.' });
  }

  try {
    // Dosyayı veritabanından bul
    const file = await UploadedFile.findOne({ _id: fileId, accessKey });
    if (!file) {
      return res.status(404).json({ message: 'Dosya bulunamadı.' });
    }

    // Dosyanın dosya sistemindeki yolunu belirle
    const filePath = file.filePath;

    // Dosya sisteminden dosyayı sil
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    } else {
      return res.status(404).json({ message: 'Dosya dosya sisteminde bulunamadı.' });
    }

    // Dosyayı veritabanından sil
    await UploadedFile.findByIdAndDelete(fileId);

    res.status(200).json({ message: 'Dosya başarıyla silindi.' });
  } catch (error) {
    console.error('Dosya silinirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosya silinirken bir hata oluştu.' });
  }
};