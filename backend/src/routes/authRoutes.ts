import { Router } from 'express';
import { mailControl, verifyCode, registerUser, loginUser } from '../controllers/authController';

const router = Router();

router.post('/mailcontrol', mailControl);  // Mail doğrulama kodu gönderme
router.post('/verify', verifyCode);  // Doğrulama kodunu kontrol et
router.post('/register', registerUser);  // Kullanıcı adı ve şifre ile kayıt
router.post('/login', loginUser);  // Giriş ve JWT token oluşturma

export default router;
