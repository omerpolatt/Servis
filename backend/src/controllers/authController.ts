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

      // Geçici doğrulama kodunu bellekte saklayın
      // Doğrulama kodunu kullanıcı modeline eklemek yerine, ayrı bir şekilde tutabilirsiniz
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
      // Bu kısımda geçici olarak sakladığınız doğrulama kodunu kontrol etmelisiniz
      // Eğer doğrulama kodu doğruysa kullanıcıya kaydolma izni verirsiniz

      // E-posta doğrulandıysa
      res.status(200).json({ message: 'E-posta doğrulandı. Artık kayıt olabilirsiniz.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Doğrulama kodu hatalı.' });
  }
};

// Kullanıcıyı kayıt et
export const registerUser = async (req: Request, res: Response) => {
  const { email, name, password } = req.body;

  try {
      // E-posta zaten kayıtlı mı kontrol et
      const userExists = await User.findOne({ UserMail: email });
      if (userExists) {
          return res.status(400).json({ message: 'Bu e-posta ile zaten kayıt olunmuş.' });
      }

      // Kullanıcı oluştur ve kaydet
      const newUser = new User({
          UserMail: email,
          UserName: name,
          UserPassword: password,  // Şifreyi burada hashlemiyoruz, pre-save hook bunu yapacak
      });

      await newUser.save();

      res.status(200).json({ message: 'Kayıt başarılı. Artık giriş yapabilirsiniz.' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Kayıt işlemi sırasında bir hata oluştu.' });
  }
};


// Kullanıcıyı e-posta ve şifre ile giriş yap
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
      // Kullanıcıyı bul
      const user = await User.findOne({ UserMail: email });
      if (!user) {
          console.log(`Kullanıcı bulunamadı: ${email}`);
          return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
      }

      // Şifreyi kontrol et
      const isMatch = await bcrypt.compare(password, user.UserPassword);
      if (!isMatch) {
          console.log(`Şifre uyuşmadı: Girilen şifre: ${password}, Veritabanındaki şifre: ${user.UserPassword}`);
          return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
      }

      // JWT token oluştur
      const token = jwt.sign(
          { userId: user._id, name: user.UserName }, 
          process.env.JWT_SECRET_KEY as string,
          { expiresIn: '1h' }
      );
      
      res.status(200).json({ message: 'Giriş başarılı.', token });
  } catch (error) {
      res.status(500).json({ message: 'Giriş işlemi sırasında bir hata oluştu.' });
  }
};
