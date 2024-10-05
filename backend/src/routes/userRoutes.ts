import { Router } from 'express';
import { mailControl, verifyCode, registerUser, loginUser , logoutUser } from '../controllers/UserController';

const router = Router();

router.post('/mailcontrol', mailControl);  // Mail doğrulama kodu gönderme
router.post('/verify', verifyCode);  // Doğrulama kodunu kontrol et
router.post('/register', registerUser);  // Kullanıcı adı ve şifre ile kayıt
router.post('/login', loginUser);  // Giriş ve JWT token oluşturma
router.post('/logout', logoutUser);

export default router;
