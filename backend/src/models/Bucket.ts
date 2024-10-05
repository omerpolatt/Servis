import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './Users';

// Bucket arayüzü
export interface IBucket extends Document {
  bucketName: string;
  owner: IUser['_id'];  // Bu bucket'ın sahibi olan kullanıcı
  accessKey: string;
}

// Bucket modeli şeması
const BucketSchema: Schema = new Schema(
  {
    bucketName: { type: String, required: true, trim: true },  // Zorunlu ve boşluklardan arındırılmış
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // Kullanıcı referansı zorunlu
    accessKey: { type: String, required: true, unique: true },  // Benzersiz erişim anahtarı
  },
  { timestamps: true }  // Zaman damgası eklendi
);

// Modeli dışa aktar
export const Bucket = mongoose.model<IBucket>('Bucket', BucketSchema);
