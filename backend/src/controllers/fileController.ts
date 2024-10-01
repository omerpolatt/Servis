import { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';

export const uploadFile = async (req: Request, res: Response) => {
  console.log(req.file);  // Dosyanın backend'e gelip gelmediğini kontrol edin

  if (!req.file) {
    return res.status(400).json({ message: 'Dosya yüklenemedi, lütfen bir dosya seçin.' });
  }

  const userId = (req as any).user.userId;  // JWT'den gelen kullanıcı kimliği
  const userDir = path.join(__dirname, '..', 'storage', userId);  // Kullanıcıya özel klasör

  try {
    await fs.ensureDir(userDir);  // Klasörü oluşturma
    const filePath = path.join(userDir, req.file.originalname);  // Dosyanın kaydedileceği yer
    await fs.writeFile(filePath, req.file.buffer);  // Dosya verisini kaydetme
    res.status(200).json({ message: 'Dosya başarıyla yüklendi.' });
  } catch (error) {
    res.status(500).json({ message: 'Dosya yüklenirken bir hata oluştu.' });
  }
};
