import { Router } from 'express';
import { uploadFile, listFilesByAccessKey, deleteFileByAccessKey  , getAccessKeyByBucketId} from '../controllers/AdminFileController';
import multer from 'multer';  // Multer'i burada doğrudan kullanıyoruz
import { authMiddleware } from '../middlewares/AuthMiddlewares';  // Kullanıcının doğrulanması için gerekli middleware

const router = Router();

// Multer middleware'i: Dosyayı bellekte tutma yöntemi (memoryStorage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', authMiddleware, upload.single('file'), uploadFile);  // Dosya yükleme işlemi

// Dosya listeleme (accessKey ile)
router.get('/files/:accessKey', listFilesByAccessKey);

router.get('/buckets/accessKey/:bucketId' ,getAccessKeyByBucketId);


// Dosya silme (accessKey ve fileId ile)
router.delete('/files', authMiddleware, deleteFileByAccessKey);

export default router;
