import { Router } from 'express';
import { registerUser, verifyCodeAndRegister , loginUser } from '../controllers/authController';



const router = Router();

router.post('/register', registerUser);  // Kullanıcı kayıt ve doğrulama kodu gönderme
router.post('/verify', verifyCodeAndRegister);  // Doğrulama kodu ve şifre oluşturma
router.post('/login', loginUser);  // Giriş ve JWT token oluşturma

export default router;
