import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/Users'; 
import { sendVerificationCode } from '../services/emailService';
import dotenv from 'dotenv';

dotenv.config();

export const mailControl = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
      // E-posta zaten kayıtlı mı kontrol et
      const userExists = await User.findOne({ UserMail: email });
      if (userExists) {
          return res.status(400).json({ message: 'Bu e-posta ile zaten kayıt olunmuş.' });
      }

      // Doğrulama kodu oluştur ve kullanıcıya gönder
      const verificationCode = await sendVerificationCode(email);

      res.status(200).json({ message: 'Doğrulama kodu gönderildi. Lütfen e-postanızı kontrol edin.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Doğrulama kodu gönderilemedi.' });
  }
};

// Doğrulama kodunu kontrol et
export const verifyCode = async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body;

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

    return res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
  } catch (error) {
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
      const token = jwt.sign({ userId: user._id, name: user.UserName }, 'your_jwt_secret_key', {
        expiresIn: '1h',
      });
  
      res.status(200).json({ message: 'Giriş başarılı.', token });
    } catch (error) {
      res.status(500).json({ message: 'Giriş işlemi sırasında bir hata oluştu.' });
    }
  };
  