import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  UserName: string;
  UserMail: string;
  UserPassword: string;
  _id: Types.ObjectId;
  projects: { projectId: Types.ObjectId; projectName: string }[]; 
}

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
    projects: [{ 
      projectId: { type: Schema.Types.ObjectId, ref: 'Project' },  
      projectName: { type: String }  
    }]
  },
    
  { timestamps: true }  
);

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
