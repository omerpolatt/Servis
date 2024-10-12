import express from 'express';
import { createBucket,listBuckets,deleteBucket } from '../controllers/BucketController';

const router = express.Router();

router.post('/create-bucket', createBucket);
router.get('/list-buckets/:parentProjectId', listBuckets);
router.delete('/delete-bucket/:id', deleteBucket);


export default router;