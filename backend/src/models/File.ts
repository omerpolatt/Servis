import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  accessKey: string; 
  uploadedAt: Date;
}

const FileSchema: Schema = new Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  accessKey: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export const UploadedFile = mongoose.model<IFile>('files', FileSchema);