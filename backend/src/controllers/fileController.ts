import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

interface CustomRequest extends Request {
  userId?: string;  // JWT doğrulama middleware ile req.userId ekleniyor olmalı
}

// Kullanıcının dosyalarını listeleyen fonksiyon
export const listUserFiles = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.userId; // JWT token'dan alınan userId

    if (!userId) {
      return res.status(400).json({ message: 'Kullanıcı kimliği bulunamadı!' });
    }

    // Kullanıcının klasör yolu
    const userDir = path.join(__dirname, `../../storage/${userId}`);

    // Klasör var mı kontrol et
    if (!fs.existsSync(userDir)) {
      return res.status(404).json({ message: 'Klasör bulunamadı.' });
    }

    // Klasördeki dosyaları listele
    fs.readdir(userDir, (err, files) => {
      if (err) {
        return res.status(500).json({ message: 'Dosyalar listelenirken hata oluştu.' });
      }

      // Dosya listesini geri döndürüyoruz
      res.status(200).json({ files });
    });
  } catch (error) {
    console.error('Dosyalar listelenirken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası oluştu.' });
  }
};

// Kullanıcının kendi dosyasını silmesi için controller
export const deleteUserFile = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.userId; // JWT'den alınan kullanıcı ID'si
      const { filename } = req.params; // Silinecek dosyanın adı
  
      if (!userId) {
        return res.status(400).json({ message: 'Kullanıcı kimliği bulunamadı!' });
      }
  
      // Dosya yolu oluşturuluyor
      const filePath = path.join(__dirname, '../../storage', userId, filename); // Klasör yapınızı `storage` olarak ayarladık
  
      // Dosya mevcut mu kontrol ediyoruz
      if (fs.existsSync(filePath)) {
        // Dosyayı siliyoruz
        fs.unlinkSync(filePath);
        return res.status(200).json({ message: 'Dosya başarıyla silindi.' });
      } else {
        return res.status(404).json({ message: 'Dosya bulunamadı.' });
      }
    } catch (error) {
      console.error('Dosya silme hatası:', error);
      return res.status(500).json({ message: 'Dosya silinirken bir hata oluştu.' });
    }
  };