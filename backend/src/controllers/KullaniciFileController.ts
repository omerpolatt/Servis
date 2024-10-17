import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { UploadedFile } from '../models/File';
import { Bucket } from '../models/Bucket';
import slugify from 'slugify';
import mongoose from 'mongoose';

const UPLOADS_DIR = '/mnt/c/Users/avsro/Desktop/SPACES3';

export const uploadFile = async (req: Request, res: Response) => {
  const { project, bucket, accessKey } = req.body;

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ message: 'Dosyalar yüklenemedi, lütfen dosya(lar) seçin.' });
  }

  if (!bucket || !project || !accessKey) {
    return res.status(400).json({ message: 'Bucket adı, Proje adı veya accessKey eksik.' });
  }

  try {
    const bucketkont = await Bucket.findOne({ bucketName: bucket, accessKey });
    if (!bucketkont) {
      return res.status(403).json({ message: 'Alt klasör bulunamadı veya erişim yetkiniz yok.' });
    }

    const folderPath = path.join(UPLOADS_DIR, project, bucket);
    await fs.ensureDir(folderPath);

    const uploadedFiles = [];

    // Tüm dosyaları işleriz
    for (const file of req.files) {
      const fileExtension = path.extname(file.originalname);
      const fileNameWithoutExtension = path.basename(file.originalname, fileExtension);

      const sanitizedFileName = slugify(fileNameWithoutExtension, {
        remove: /[*+~()'"!:@]/g,
        lower: true,
        strict: true
      }) + fileExtension;

      const existingFile = await UploadedFile.findOne({ fileName: sanitizedFileName, accessKey: bucketkont.accessKey });
      
      if (existingFile) {
        return res.status(409).json({ message: `Bu isimde bir dosya zaten mevcut: ${sanitizedFileName}` });
      }

      const filePath = path.join(folderPath, sanitizedFileName);
      await fs.writeFile(filePath, file.buffer);

      const fileData = new UploadedFile({
        fileName: sanitizedFileName,
        filePath: filePath,
        fileType: file.mimetype,
        fileSize: file.size,
        accessKey: bucketkont.accessKey,
        uploadedAt: new Date(),
      });

      await fileData.save();
      uploadedFiles.push({ filePath, fileId: fileData._id });
    }

    res.status(200).json({ message: 'Dosyalar başarıyla yüklendi ve veritabanına kaydedildi.', files: uploadedFiles });
  } catch (error) {
    console.error('Dosyalar yüklenirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosyalar yüklenirken bir hata oluştu.' });
  }
};


// Alt bucket'e ait dosyaları listeleme
export const listFilesBySubBucket = async (req: Request, res: Response) => {
  const { accessKey, projectName, bucketName } = req.params;
  
  // Parametreler eksikse 400 Bad Request döndürme
  if (!accessKey || !projectName || !bucketName) {
    return res.status(400).json({ message: 'Access key, bucket adı veya proje adı gönderilmedi.' });
  }

  try {
    // Bucket'i veritabanında arama
    const bucketkont = await Bucket.findOne({ accessKey, bucketName });
    if (!bucketkont) {
      console.log("Bucket bulunamadı:", { accessKey, bucketName, projectName });
      return res.status(404).json({ message: 'Alt klasör bulunamadı veya erişim yetkiniz yok.' });
    } 

    // accessKey kullanarak ilgili dosyaları bulma
    const files = await UploadedFile.find({ accessKey });
    if (files.length === 0) {
      return res.status(200).json({ message: 'Henüz yüklenmiş dosya yok.' });
    }


    const filesWithUrls = files.map((file) => {
      // Dosya yolundan "Uploads/" kısmını çıkararak relative path oluşturuyoruz
      const relativePath = file.filePath.split('SPACES3')[1];
      console.log("Relative Path:", relativePath);
      
      // Path'in her segmentini encode ediyoruz ve '/' karakterini tekrar yerine koyuyoruz
      const encodedPath = relativePath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');
      
      return {
        ...file.toObject(),
        url: `https://22733193f73a552a32a65fa05e5daf40.serveo.net/uploads/${encodedPath}`,
      };
    });

    res.status(200).json({ files: filesWithUrls });
   

  } catch (error) {
    console.error('Dosya listelenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Dosyalar listelenemedi.' });
}
};

// Dosya ID'sine göre dosya silme işlemi
export const deleteFileById = async (req: Request, res: Response) => {
  const { fileId, accessKey } = req.params;

  if (!fileId || !accessKey) {
    return res.status(400).json({ message: 'Dosya ID ve access key gereklidir.' });
  }

  try {
    // 1. Veritabanında dosyayı bul
    const file = await UploadedFile.findOne({ _id: fileId, accessKey });
    if (!file) {
      return res.status(404).json({ message: 'Dosya veritabanında bulunamadı.' });
    }

    // 2. Dosya sistemindeki yolu belirle
    const filePath = file.filePath;

    // 3. Dosya sisteminde mevcutsa dosyayı sil
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath); // Dosya sisteminden sil
    } else {
      return res.status(404).json({ message: 'Dosya dosya sisteminde bulunamadı.' });
    }

    // 4. Veritabanındaki dosya kaydını sil
    await UploadedFile.findByIdAndDelete(fileId);

    res.status(200).json({ message: 'Dosya başarıyla silindi.' });
  } catch (error) {
    console.error('Dosya silinirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosya silinirken bir hata oluştu.' });
  }
};



export const getFileById = async (req: Request, res: Response) => {
  const { fileId, accessKey } = req.params;

  try {
    const file = await UploadedFile.findOne({ _id: new mongoose.Types.ObjectId(fileId), accessKey });
    if (!file) {
      return res.status(404).json({ message: 'Dosya bulunamadı.' });
    }

    const relativePath = file.filePath.split('SPACES3')[1];
    const encodedPath = relativePath
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');

    res.status(200).json({
      ...file.toObject(),
      url: `https://22733193f73a552a32a65fa05e5daf40.serveo.net/uploads/${encodedPath}`,
    });
  } catch (error) {
    console.error('Dosya getirilemedi:', error);
    res.status(500).json({ message: 'Dosya getirilemedi.' });
  }
};