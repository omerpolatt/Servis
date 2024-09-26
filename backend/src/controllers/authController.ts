import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/Users'; 
import { sendVerificationCode } from '../services/emailService';


// Kullanıcıyı e-posta adresi ile kayıt işlemi
export const registerUser = async (req: Request, res: Response) => {
    const { email } = req.body;
  
    try {
      // E-posta zaten kayıtlı mı kontrol et
      const userExists = await User.findOne({ UserMail: email });
      if (userExists) {
        return res.status(400).json({ message: 'Bu e-posta ile zaten kayıt olunmuş.' });
      }
  
      // Doğrulama kodu oluştur ve kullanıcıya gönder
      const verificationCode = await sendVerificationCode(email);
  
      // Kullanıcı oluştur ve geçici bilgileri sakla
      const newUser = new User({
        UserMail: email, 
        UserName: 'asd',  // Şu an ismi yok, daha sonra ekleyeceğiz
        UserPassword: 'asd',  // Şu an şifresi yok, daha sonra ekleyeceğiz
        verificationCode,  // Doğrulama kodu kaydedilecek
      });
  
      await newUser.save();
  
      res.status(200).json({ message: 'Doğrulama kodu gönderildi. Lütfen e-postanızı kontrol edin.' });
    } catch (error) {
        console.error(error);
      res.status(500).json({ message: 'Doğrulama kodu gönderilemedi.' });
    }
  };

// 2. Doğrulama Kodu Doğrulama ve Kayıt
export const verifyCodeAndRegister = async (req: Request, res: Response) => {
    const { email, verificationCode ,name, password } = req.body;
  
    try {
      // Kullanıcıyı bul ve doğrulama kodunu kontrol et
      const user = await User.findOne({ UserMail: email });
  
      if (!user) {
        return res.status(400).json({ message: 'Kullanıcı bulunamadı veya doğrulama kodu hatalı.' });
      }
  
      // Şifreyi hashle
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Kullanıcı bilgilerini güncelle
      user.UserName = name;
      user.UserPassword = hashedPassword;
  
      await user.save();  // Güncellenen bilgileri kaydet
  
      res.status(200).json({ message: 'Kayıt başarılı. Artık giriş yapabilirsiniz.' });
    } catch (error) {
      res.status(500).json({ message: 'Kayıt işlemi sırasında bir hata oluştu.' });
    }
  };
  

//Giriş ve JWT Token Oluşturma
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
        console.log(`Şifre uyuşmadı: ${password}`);
        return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
      }
  
      // JWT token oluştur
      const token = jwt.sign({ userId: user._id, name: user.UserName }, 'your_jwt_secret_key', {
        expiresIn: '1h',  // Token 1 saat geçerli
      });
  
      res.status(200).json({ message: 'Giriş başarılı.', token });
    } catch (error) {
      res.status(500).json({ message: 'Giriş işlemi sırasında bir hata oluştu.' });
    }
  };
