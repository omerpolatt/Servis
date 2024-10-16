import express from 'express';
    import { uploadFile, listFilesBySubBucket,deleteFileById,getFileById} from '../controllers/KullaniciFileController';
    import multer from 'multer';

    const router = express.Router();
    const upload = multer(); // multer middleware'i dosya işlemleri için kullanıyoruz

    // Dosya yükleme
    router.post('/s3Space', upload.single('file'), uploadFile);

  // Alt bucket'e ait dosyaları listeleme
  router.get('/s3Space/:projectName/:bucketName/:accessKey/:fileId?', async (req, res) => {
    const { fileId } = req.params;
    
    if (fileId) {
      // fileId varsa tek bir dosyayı getir
      await getFileById(req, res);
    } else {
      // fileId yoksa tüm dosyaları listele
      await listFilesBySubBucket(req, res)
    }
});

    router.delete('/s3Space/:projectName/:bucketName/:accessKey/:fileId', deleteFileById);



    export default router;