import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/Users'; 
import { sendVerificationCode } from '../services/emailService';
import dotenv from 'dotenv';
import fs from 'fs-extra'; // fs-extra modülü ile klasör işlemleri
import path from 'path'; // Klasör yollarını daha düzgün oluşturmak için
import mongoose from 'mongoose';

dotenv.config();

export const mailControl = async (req: Request, res: Response) => {
  const { UserMail } = req.body;

  try {
      // E-posta zaten kayıtlı mı kontrol et
      const userExists = await User.findOne({ UserMail: UserMail });
      if (userExists) {
          return res.status(400).json({ message: 'Bu e-posta ile zaten kayıt olunmuş.' });
      }

      // Doğrulama kodu oluştur ve kullanıcıya gönder
      const verificationCode = await sendVerificationCode(UserMail);

      res.status(200).json({ message: 'Doğrulama kodu gönderildi. Lütfen e-postanızı kontrol edin.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Doğrulama kodu gönderilemedi.' });
  }
};

// Doğrulama kodunu kontrol et
export const verifyCode = async (req: Request, res: Response) => {
  const { UserMail, verificationCode } = req.body;

  try {
      // E-posta doğrulandıysa
      res.status(200).json({ message: 'E-posta doğrulandı. Artık kayıt olabilirsiniz.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Doğrulama kodu hatalı.' });
  }
};

// Kullanıcıyı kayıt et
export const registerUser = async (req: Request, res: Response) => {
  const { UserName, UserMail, UserPassword } = req.body;

  if (!UserName || !UserMail || !UserPassword) {
    return res.status(400).json({ message: 'Kullanıcı adı, e-posta ve şifre gerekli.' });
  }

  try {
    // Mevcut kullanıcıyı kontrol et
    const userExists = await User.findOne({ UserMail });
    if (userExists) {
      return res.status(400).json({ message: 'Bu e-posta ile zaten kayıt olunmuş.' });
    }

    // Yeni kullanıcı oluştur
    const newUser = new User({ UserName, UserMail, UserPassword });
    await newUser.save();

    // Kullanıcı ID'sine göre bucket oluşturulacak yol (WSL içinde Windows yolu kullanıyoruz)
    const userId = newUser._id as mongoose.Types.ObjectId; // ObjectId türünü kullanarak _id'yi doğru tanımlıyoruz.
    const bucketPath = path.join('/mnt/c/Users/avsro/Desktop/SPACES3', userId.toString());  // WSL içinde Windows klasör yolu

    // Klasör yolunu terminale yazdır ve kontrol et
    console.log(`Bucket oluşturulacak yol: ${bucketPath}`);

    // Klasör oluştur (zaten varsa hata vermez)
    try {
      await fs.ensureDir(bucketPath); // Klasör oluşturma işlemi
      console.log(`Klasör başarıyla oluşturuldu: ${bucketPath}`);
      
      // Klasör gerçekten oluşturuldu mu kontrol edelim
      const exists = await fs.pathExists(bucketPath);
      if (exists) {
        console.log(`Klasör gerçekten mevcut: ${bucketPath}`);
      } else {
        console.log(`Klasör oluşturulamadı: ${bucketPath}`);
      }
    } catch (folderError) {
      console.error(`Klasör oluşturma sırasında hatası`)
    }

    return res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
  } catch (error) {
    console.error('Kayıt sırasında hata oluştu:', error);
    return res.status(500).json({ message: 'Kayıt sırasında bir hata oluştu.' });
  }
};




// Kullanıcıyı e-posta ve şifre ile giriş yap
export const loginUser = async (req: Request, res: Response) => {
    const { UserMail, UserPassword } = req.body;  // req.body'den gelen verileri kontrol et
  
    if (!UserMail || !UserPassword) {
      return res.status(400).json({ message: 'E-posta ve şifre gereklidir.' });
    }
  
    try {
      // Kullanıcıyı bul ve şifreyi karşılaştır
      const user = await User.findOne({ UserMail });
      if (!user) {
        console.log(`Kullanıcı bulunamadı: ${UserMail}`);
        return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
      }
  
      const isMatch = await bcrypt.compare(UserPassword, user.UserPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
      }
  
      // Başarılı giriş işlemi
      const token = jwt.sign({ userId: user._id, name: user.UserName, email: user.UserMail }, process.env.JWT_SECRET_KEY || 'U38niWorkHUbSeCuRity', {
        expiresIn: '1h',
      });
      
  
      res.status(200).json({ message: 'Giriş başarılı.', token });
    } catch (error) {
      res.status(500).json({ message: 'Giriş işlemi sırasında bir hata oluştu.' });
    }
  };
  

  export const logoutUser = async (req: Request, res: Response) => {
    try {
        // Cookie'deki token'ı temizliyoruz
        res.clearCookie('token', {
            httpOnly: true, // XSS saldırılarına karşı koruma
            secure: process.env.NODE_ENV === 'production', // HTTPS kullanıyorsanız secure:true yapın
            sameSite: 'strict', // CSRF saldırılarına karşı koruma
        });
        res.status(200).json({ message: 'Başarıyla çıkış yapıldı.' });
    } catch (error) {
        console.error('Çıkış işlemi sırasında hata:', error);
        res.status(500).json({ message: 'Çıkış işlemi sırasında bir hata oluştu.' });
    }
};
  