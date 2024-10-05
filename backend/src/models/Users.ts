import mongoose, { Schema, Document, Types } from 'mongoose';

// Kullanıcı arayüzü
export interface IUser extends Document {
  UserName: string;
  UserMail: string;
  UserPassword: string;
  _id: Types.ObjectId;
  buckets: { bucketId: Types.ObjectId; bucketName: string }[];  // Bucket referanslarının listesi
}

// Kullanıcı şeması
const UserSchema: Schema = new Schema(
  {
    UserName: { type: String, required: true, trim: true },  // Kullanıcı adı zorunlu ve boşluklar temizlenecek
    UserMail: { 
      type: String, 
      unique: true, 
      required: true, 
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/  // E-posta formatı kontrolü
    }, 
    UserPassword: { type: String, required: true },  // Şifre zorunlu
    buckets: [{ 
      bucketId: { type: Schema.Types.ObjectId, ref: 'Bucket' },  // Bucket ID'si
      bucketName: { type: String }  // Bucket ismi
    }]
  },
    
  { timestamps: true }  
);

// Model oluşturma
const User = mongoose.model<IUser>('User', UserSchema);

export default User;
