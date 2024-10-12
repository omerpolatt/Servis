import express from 'express';
    import { uploadFile, listFilesBySubBucket,deleteFileById} from '../controllers/KullaniciFileController';
    import multer from 'multer';

    const router = express.Router();
    const upload = multer(); // multer middleware'i dosya işlemleri için kullanıyoruz

    // Dosya yükleme
    router.post('/s3Space', upload.single('file'), uploadFile);

    // Alt bucket'e ait dosyaları listeleme
    router.get('/s3Space/:projectName/:bucketName/:accessKey', listFilesBySubBucket);

    router.delete('/s3Space/:projectName/:bucketName/:accessKey/:fileId', deleteFileById);



    export default router;