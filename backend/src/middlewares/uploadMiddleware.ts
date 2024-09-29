import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express'; // Express'in Request tipini kullanıyoruz

// `Request` arayüzünü genişletiyoruz, böylece userId gibi özelliklere erişim sağlayabiliyoruz.
interface CustomRequest extends Request {
  userId?: string;  // JWT doğrulama middleware ile req.userId ekleniyor olmalı
}

// Multer disk storage setup
const storage = multer.diskStorage({
  destination: (req: CustomRequest, file, cb) => {  
    const userId = req.userId;  // JWT token'dan alınan userId (auth middleware ile eklenmiş olmalı)
    
    if (!userId) {
      // Eğer `userId` yoksa hata döndürüyoruz.
      return cb(new Error("Kullanıcı kimliği bulunamadı!"), ""); // Hata ve boş bir string döndürülüyor
    }

    // Kullanıcıya özel klasör yolu
    const dir = path.join(__dirname, `../../uploads/${userId}`);

    // Eğer klasör yoksa hata döndürüyoruz, artık klasör oluşturmuyoruz
    if (!fs.existsSync(dir)) {
        return cb(new Error("Kullanıcı klasörü bulunamadı. Lütfen önce kaydolun."), ""); // Hata döndürülüyor
      }
      
      cb(null, dir); // Klasörün mevcut olduğunu multer'a bildiriyoruz
  },
  
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Benzersiz bir dosya ismi oluşturuyoruz
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`); // Dosya ismini oluşturuyoruz
  }
});

// Dosya türlerini kontrol eden filter fonksiyonu
const fileFilter = (req: CustomRequest, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']; // Kabul edilen dosya türleri

  // Eğer dosya türü izin verilenlerden ise dosyayı kabul ediyoruz
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Hata yok, dosya kabul
  } else {
    // Uygun olmayan dosya türü olduğunda hata döndürüyoruz
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname)); // MulterError ile hata oluşturuyoruz
  }
};

// Multer middleware: single('file') ile tek dosya yüklenmesine izin veriyoruz
export const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Dosya boyutu limiti 5 MB
  }
}).single('file');
