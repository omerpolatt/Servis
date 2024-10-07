import mongoose, { Schema, Document } from 'mongoose';

export interface IBucket extends Document {
  bucketName: string;
  owner: mongoose.Types.ObjectId;
  accessKey: string;
  subfolders: mongoose.Types.ObjectId[]; // alt klasörleri gösteriyoruz 
  path: string;  // Dosya sistemindeki yol
}

const BucketSchema: Schema = new Schema({
  bucketName: { type: String, required: true , unique:true},
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessKey: { type: String, required: true },
  path: { type: String, required: true },  
  subfolders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subfolder' }]
});

export const Bucket = mongoose.model<IBucket>('Bucket', BucketSchema);
