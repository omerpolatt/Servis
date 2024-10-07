import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  fileName: string;
  filePath: string;  // Dosyanın dosya sistemindeki yolu
  fileType: string;  // Dosya türü (MIME type)
  fileSize: number;  // Dosya boyutu (byte cinsinden)
  subfolderId: mongoose.Types.ObjectId;  // Hangi alt klasörde olduğu
  uploadedAt: Date;  // Yüklenme tarihi
}

const FileSchema: Schema = new Schema({
  fileName: { type: String, required: true },  // Dosya adı
  filePath: { type: String, required: true },  // Dosyanın tam dosya yolu
  fileType: { type: String, required: true },  // Dosya türü (MIME type)
  fileSize: { type: Number, required: true },  // Dosya boyutu (byte cinsinden)
  subfolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subfolder', required: true },  // Hangi alt klasöre ait olduğu
  uploadedAt: { type: Date, default: Date.now },  // Yüklenme tarihi otomatik olarak şu anki tarih
});

// Model tanımı
export const UploadedFile = mongoose.model<IFile>('UploadedFile', FileSchema);
