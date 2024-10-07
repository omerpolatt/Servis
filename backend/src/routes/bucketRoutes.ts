import { Router } from 'express';
import { createBucket, deleteBucket, updateBucketName, listUserBuckets } from '../controllers/BucketController';  // Controller fonksiyonları

const router = Router();

// Bucket oluşturma rotası
router.post('/create', createBucket);  // Kullanıcının bucket oluşturmasına izin veren rota

// Bucket silme rotası
router.delete('/:bucketId', deleteBucket);  // Bucket ID'ye göre silme işlemi

// Bucket güncelleme (PUT/PATCH) rotası
router.patch('/:bucketId', updateBucketName);  // Bucket adını güncelleyen rota

// Kullanıcıya ait bucket'ları listeleme rotası
router.get('/list', listUserBuckets);  // Kullanıcının tüm bucket'larını listeleyen rota

export default router;
