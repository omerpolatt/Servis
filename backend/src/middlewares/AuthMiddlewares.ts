import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;  // Token'dan beklenen userId tipi
  email: string;   // İsteğe bağlı olarak başka bilgileri de ekleyebilirsin
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');  // Authorization header'ı al
  const token = authHeader && authHeader.split(' ')[1];  // Bearer token kısmını al

  if (!token) {
    return res.status(401).json({ message: 'Erişim reddedildi. Token gerekli.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || "U38niWorkHUbSeCuRity") as JwtPayload;  // Token'ı doğrula ve tipini belirt
    (req as any).user = decoded;  // Doğrulanan kullanıcıyı isteğe ekle
    next();  // Sonraki middleware'e geç
  } catch (error) {
    res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
  }
};
