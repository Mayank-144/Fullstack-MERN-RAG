import mongoose from 'mongoose';
import { getVectorDbProvider } from '../config/pinecone.js';

const ChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true,
      index: true
    },
    chunkIndex: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    // 1024-dimensional float vector for Cohere Embed v3 (Required only in MongoDB Atlas mode)
    embedding: {
      type: [Number],
      required: function () {
        return getVectorDbProvider() !== 'pinecone';
      }
    },
    metadata: {
      charCount: Number,
      tokenEstimate: Number,
      pageNumber: Number,
      sheetName: String
    }
  },
  {
    timestamps: true
  }
);

// Compound index for quick document chunk lookups
ChunkSchema.index({ documentId: 1, chunkIndex: 1 });

export default mongoose.model('Chunk', ChunkSchema);
