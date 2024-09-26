import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

// Kullanıcı arayüzü
export interface IUser extends Document {
  UserName: string;
  UserMail: string;
  UserPassword: string;
  comparePassword: (password: string) => Promise<boolean>;  // Şifreyi karşılaştırmak için bir yöntem
}

// Kullanıcı şeması
const UserSchema: Schema = new Schema(
  {
    UserName: { type: String},
    UserMail: { type: String},  // E-posta adresinin benzersiz (unique) olması iyi olur
    UserPassword: { type: String },
  },
  { timestamps: true }
);

// Şifre hashleme işlemi, kaydetmeden önce (pre-save hook)
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('UserPassword')) {
    return next();  // Şifre değiştirilmemişse işlemi atla
  }

  try {
    const salt = await bcrypt.genSalt(10);  // Salt oluşturma
    this.UserPassword = await bcrypt.hash(this.UserPassword, salt);  // Şifreyi hashleme
    next();
  } catch (error) {
    console.log("Hashleme hatası ",error)
  }
});

// Şifreyi karşılaştırma yöntemi
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.UserPassword);  // Şifreyi hashlenmiş şifre ile karşılaştır
};

// Model oluşturma
const User = mongoose.model<IUser>('User', UserSchema);

export default User;
