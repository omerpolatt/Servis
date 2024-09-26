import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Authorization header'dan token'ı al

  if (!token) {
    return res.status(401).json({ message: 'Erişim reddedildi. Token gerekli.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    (req as any).user = decoded; // Doğrulanan kullanıcı bilgilerini isteğe ekle
    next(); // Sonraki middleware'e geç
  } catch (error) {
    res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};
