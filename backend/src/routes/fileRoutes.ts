import { Router } from 'express';
import { uploadFile , listFilesByBucket, deleteFile } from '../controllers/FileController';  // Dosya yükleme controller'ı
import multer from 'multer';  // Multer'i burada doğrudan kullanıyoruz
import { authMiddleware } from '../middlewares/AuthMiddlewares';  // Kullanıcının doğrulanması için gerekli middleware

const router = Router();

// Multer middleware'i: Dosyayı bellekte tutma yöntemi (memoryStorage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', authMiddleware, upload.single('file'), uploadFile);  // Dosya yükleme işlemi

// Dosya listeleme
router.get('/files', listFilesByBucket);

// Dosya silme
router.delete('/files/:fileName', deleteFile);

export default router;
