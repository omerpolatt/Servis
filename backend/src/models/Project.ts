import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  projectName: string;
  owner: mongoose.Types.ObjectId;
  accessKey: string;
  bucket: { 
    bucketId: mongoose.Types.ObjectId; 
    bucketName: string; 
  }[]; // Alt klasörleri hem ID hem de isimle göstereceğiz
  path: string;  // Dosya sistemindeki yol
}

const ProjectSchema: Schema = new Schema({
  projectName: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessKey: { type: String, required: true },
  path: { type: String, required: true },
 bucket: [
    {
      bucketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bucket' }, 
      bucketName: { type: String } 
    }
  ]
});

export const Project = mongoose.model<IProject>('Project', ProjectSchema);