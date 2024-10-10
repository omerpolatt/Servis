import mongoose, { Document, Schema } from 'mongoose';

interface IBucket extends Document {
    bucketName: string;
    accessKey: string;
    projectId: mongoose.Schema.Types.ObjectId;
    path: string;
}

// Şema tanımı
const BucketSchema: Schema = new Schema({
    bucketName: { type: String, required: true },  // Alt klasör adı
    accessKey: { type: String, required: true },  // Erişim anahtarı
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },  
    path: { type: String, required: true },  // Alt klasörün tam dosya yolu
});

// Model tanımı
export const Bucket = mongoose.model<IBucket>('Bucket', BucketSchema);