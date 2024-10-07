import mongoose, { Document, Schema } from 'mongoose';

interface ISubfolder extends Document {
    subFolderName: string;
    accessKey: string;
    bucketId: mongoose.Schema.Types.ObjectId;
    path: string;
}

// Şema tanımı
const SubfolderSchema: Schema = new Schema({
    subFolderName: { type: String, required: true },  // Alt klasör adı
    accessKey: { type: String, required: true },  // Erişim anahtarı
    bucketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bucket', required: true },  // Hangi bucket'a ait olduğu
    path: { type: String, required: true },  // Alt klasörün tam dosya yolu
});

// Model tanımı
export const Subfolder = mongoose.model<ISubfolder>('Subfolder', SubfolderSchema);
