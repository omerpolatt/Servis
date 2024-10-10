import express from 'express';
import { createBucket,listBuckets,deleteBucket } from '../controllers/BucketController';

const router = express.Router();

router.post('/create-subbucket', createBucket);
router.get('/list-subbuckets/:parentBucketId', listBuckets);
router.delete('/delete-subbucket/:bucketId', deleteBucket);

export default router;