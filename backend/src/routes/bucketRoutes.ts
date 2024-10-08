import express from 'express';
import { createSubbucket, listSubbuckets } from '../controllers/BucketController';

const router = express.Router();

router.post('/create-subbucket', createSubbucket);
router.get('/list-subbuckets/:parentBucketId', listSubbuckets); 

export default router;