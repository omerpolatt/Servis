import mongoose, { Schema, Document } from 'mongoose';

export interface IBucket extends Document {
  bucketName: string;
  owner: mongoose.Types.ObjectId;
  accessKey: string;
  subfolders: { 
    subFolderId: mongoose.Types.ObjectId; 
    subFolderName: string; 
  }[]; // Alt klasörleri hem ID hem de isimle göstereceğiz
  path: string;  // Dosya sistemindeki yol
}

const BucketSchema: Schema = new Schema({
  bucketName: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessKey: { type: String, required: true },
  path: { type: String, required: true },
  subfolders: [
    {
      subFolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subfolder' }, // Subfolder ID
      subFolderName: { type: String } // Subfolder adı
    }
  ]
});

export const Bucket = mongoose.model<IBucket>('Bucket', BucketSchema);