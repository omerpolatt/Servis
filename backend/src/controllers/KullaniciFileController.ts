import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { UploadedFile } from '../models/File';
import { Bucket } from '../models/Bucket';
import slugify from 'slugify';

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
    const bucketkont = await Bucket.findOne({ bucketName: bucket, accessKey });
    if (!bucketkont) {
      return res.status(403).json({ message: 'Alt klasör bulunamadı veya erişim yetkiniz yok.' });
    }

    const folderPath = path.join(UPLOADS_DIR, project, bucket);
    await fs.ensureDir(folderPath);

    // Dosya adını ve uzantısını ayırın
    const fileExtension = path.extname(req.file.originalname); // .png, .jpg gibi uzantıyı alıyoruz
    const fileNameWithoutExtension = path.basename(req.file.originalname, fileExtension); // Uzantısız dosya adı

    // Dosya adını slugify ederek temizle, URL dostu hale getir
    const sanitizedFileName = slugify(fileNameWithoutExtension, {
      remove: /[*+~()'"!:@]/g, // Özel karakterleri kaldır
      lower: true,             // Dosya adını küçük harflere çevir
      strict: true             // URL'de geçerli olmayan karakterleri kaldır
    }) + fileExtension;        // Uzantıyı geri ekle

    const filePath = path.join(folderPath, sanitizedFileName); // Dosya adını slugify edilmiş haliyle kaydet
    await fs.writeFile(filePath, req.file.buffer);

    // Veritabanına kaydederken de slugify edilmiş dosya adını kullanıyoruz
    const fileData = new UploadedFile({
      fileName: sanitizedFileName,  // Slugify edilmiş dosya adını kaydediyoruz
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


    // Her dosya için URL oluştur
    const filesWithUrls = files.map((file) => ({
      ...file.toObject(),
      url: `https://94e6e3aaf7fa43528f29db9004239cdf.serveo.net/${file.fileName}`, // Burada dosya URL'sini oluşturuyorsunuz
    }));

    res.status(200).json({ files: filesWithUrls });
   

  } catch (error) {
    console.error('Dosya listelenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Dosyalar listelenemedi.' });
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
      await fs.remove(filePath);  // Dosyayı dosya sisteminden sil
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
