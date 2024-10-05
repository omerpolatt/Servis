import { Router } from 'express';
import { createBucket } from '../controllers/BucketController';  


const router = Router();

// Bucket oluşturma rotası
router.post('/create',  createBucket);  // Kullanıcının bucket oluşturmasına izin veren rota

export default router;
