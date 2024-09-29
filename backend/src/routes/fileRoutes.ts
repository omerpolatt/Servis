import express from 'express';
import { upload } from '../middlewares/uploadMiddleware'; // Yükleme middleware'i
import { listUserFiles , deleteUserFile } from '../controllers/fileController'; // Listeleme controller'ı


const router = express.Router();

// Dosya yükleme route'u
router.post('/upload', upload, (req, res) => {
  res.status(200).json({ message: 'Dosya başarıyla yüklendi.' });
});

// Kullanıcının dosyalarını listeleyen route
router.get('/',  listUserFiles);

// Kullanıcının dosyasını silen route
router.delete('/:filename', deleteUserFile);


export default router;