import mongoose, { Schema, Document, Types } from 'mongoose';

// Kullanıcı arayüzü
export interface IUser extends Document {
  UserName: string;
  UserMail: string;
  UserPassword: string;
  _id: Types.ObjectId;
}

// Kullanıcı şeması
const UserSchema: Schema = new Schema(
  {
    UserName: { type: String },
    UserMail: { type: String, unique: true }, // E-posta adresinin benzersiz (unique) olması
    UserPassword: { type: String },
  },
  { timestamps: true }
);

// Model oluşturma
const User = mongoose.model<IUser>('User', UserSchema);

export default User;
