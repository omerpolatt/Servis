import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';

export const uploadFile = async (req: Request, res: Response) => {
  console.log(req.file);  // Dosyanın backend'e gelip gelmediğini kontrol edin

  if (!req.file) {
    return res.status(400).json({ message: 'Dosya yüklenemedi, lütfen bir dosya seçin.' });
  }

  const userId = (req as any).user.userId;  // JWT'den gelen kullanıcı kimliği
  
  // Kullanıcının klasör yolu (WSL ile Windows dosya sistemine erişim)
  const userDir = path.join('/mnt/c/Users/avsro/Desktop/SPACES3', userId);  // Kullanıcının bucket dizini

  try {
    await fs.ensureDir(userDir);  // Klasörü oluşturma (zaten varsa hata vermez)
    
    // Dosyanın kaydedileceği yer
    const filePath = path.join(userDir, req.file.originalname);
    
    // Dosya verisini kaydetme
    await fs.writeFile(filePath, req.file.buffer);
    
    res.status(200).json({ message: 'Dosya başarıyla yüklendi.', filePath });
  } catch (error) {
    console.error('Dosya yüklenirken hata oluştu:', error);
    res.status(500).json({ message: 'Dosya yüklenirken bir hata oluştu.' });
  }
};

// dosyalarını görüntüleyebilemleri için gerekli fonksiyon 

export const listFiles = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;  // JWT'den gelen kullanıcı kimliği
  
  // Kullanıcının bucket dizini
  const userDir = path.join('/mnt/c/Users/avsro/Desktop/SPACES3', userId);

  try {
    // Kullanıcının klasöründeki dosyaları listele
    const files = await fs.readdir(userDir);

    if (files.length === 0) {
      return res.status(200).json({ message: 'Henüz yüklenmiş dosya yok.' });
    }

    // Dosya isimlerini dön
    return res.status(200).json({ files });
  } catch (error) {
    console.error('Dosya listelenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Dosyalar listelenemedi.' });
  }
};


// dosyalrını sileceği fonksiyon 

export const deleteFile = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;  // JWT'den gelen kullanıcı kimliği
  const { fileName } = req.params;  // Silinecek dosyanın adı, URL parametresinden alınır

  // Kullanıcının bucket dizini
  const userDir = path.join('/mnt/c/Users/avsro/Desktop/SPACES3', userId);
  const filePath = path.join(userDir, fileName);  // Silinecek dosyanın tam yolu

  try {
    // Dosyanın var olup olmadığını kontrol et
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return res.status(404).json({ message: 'Dosya bulunamadı.' });
    }

    // Dosyayı sil
    await fs.remove(filePath);
    return res.status(200).json({ message: 'Dosya başarıyla silindi.' });
  } catch (error) {
    console.error('Dosya silinirken hata oluştu:', error);
    return res.status(500).json({ message: 'Dosya silinemedi.' });
  }
};