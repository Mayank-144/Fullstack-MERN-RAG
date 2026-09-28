import mongoose from 'mongoose';
import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import { parseDocument } from '../services/parserService.js';
import { splitIntoChunks } from '../services/chunkService.js';
import { generateEmbeddings } from '../services/cohereService.js';
import {
  getVectorDbProvider,
  isPineconeConfigured
} from '../config/pinecone.js';
import {
  upsertChunks,
  deleteChunksByDocumentId
} from '../services/pineconeService.js';

/**
 * Upload, parse, chunk, embed, and store document
 * Dispatches vector storage to either MongoDB Atlas or Pinecone based on VECTOR_DB
 */
export const uploadDocument = async (req, res) => {
  let createdDocumentId = null;
  let chunkIndexesForRollback = [];

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB database is not connected. Please check your IP whitelist in MongoDB Atlas.'
      });
    }

    const isPinecone = getVectorDbProvider() === 'pinecone';

    if (isPinecone && !isPineconeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Pinecone is selected as the vector database but is not configured. Please set PINECONE_API_KEY and PINECONE_INDEX_NAME in server/.env.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a file to upload (.pdf, .xlsx, .xls).'
      });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    // Step 1: Parse PDF or Excel to text
    const parsedData = await parseDocument(buffer, originalname, mimetype);

    if (!parsedData.text || parsedData.text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is empty or contains no readable text.'
      });
    }

    // Step 2: Split text into overlapping semantic chunks
    const chunks = splitIntoChunks(parsedData.text, {
      chunkSize: 800,
      chunkOverlap: 150
    });

    if (chunks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create chunks from document text.'
      });
    }

    chunkIndexesForRollback = chunks.map((c) => c.chunkIndex);

    // Step 3: Generate Cohere Embed v3 embeddings (search_document mode)
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await generateEmbeddings(chunkTexts, 'search_document');

    // Step 4: Save Document metadata in MongoDB
    const newDocument = await Document.create({
      fileName: originalname,
      originalName: originalname,
      fileType: parsedData.fileType,
      mimeType: mimetype,
      fileSize: size,
      chunkCount: chunks.length,
      metadata: parsedData.metadata
    });
    createdDocumentId = newDocument._id;

    // Step 5: Vector DB and MongoDB Chunk Storage
    if (isPinecone) {
      // Pinecone Mode: Upsert vectors to Pinecone and store chunks in MongoDB WITHOUT embeddings
      try {
        const pineconeRecords = chunks.map((chunk, idx) => ({
          documentId: newDocument._id.toString(),
          fileName: originalname,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          embedding: embeddings[idx],
          charCount: chunk.charCount,
          tokenEstimate: chunk.tokenEstimate
        }));

        await upsertChunks(pineconeRecords);

        const mongoChunkDocs = chunks.map((chunk) => ({
          documentId: newDocument._id,
          fileName: originalname,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          metadata: {
            charCount: chunk.charCount,
            tokenEstimate: chunk.tokenEstimate
          }
        }));

        await Chunk.insertMany(mongoChunkDocs);
      } catch (storageError) {
        // Safe Rollback - must never throw
        try {
          await deleteChunksByDocumentId(newDocument._id.toString(), chunkIndexesForRollback);
        } catch (rbPineconeErr) {
          console.error('Pinecone rollback error (ignored):', rbPineconeErr.message);
        }

        try {
          await Chunk.deleteMany({ documentId: newDocument._id });
          await Document.findByIdAndDelete(newDocument._id);
        } catch (rbMongoErr) {
          console.error('MongoDB rollback error (ignored):', rbMongoErr.message);
        }

        throw storageError;
      }
    } else {
      // MongoDB Atlas Mode: Store chunks with embedding vectors directly in MongoDB
      const chunkDocuments = chunks.map((chunk, idx) => ({
        documentId: newDocument._id,
        fileName: originalname,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        embedding: embeddings[idx], // 1024-dimensional float vector
        metadata: {
          charCount: chunk.charCount,
          tokenEstimate: chunk.tokenEstimate
        }
      }));

      await Chunk.insertMany(chunkDocuments);
    }

    const successMessage = isPinecone
      ? `File "${originalname}" processed and stored in Pinecone Vector DB successfully!`
      : `File "${originalname}" processed and stored in Vector DB successfully!`;

    return res.status(201).json({
      success: true,
      message: successMessage,
      document: {
        id: newDocument._id,
        fileName: newDocument.fileName,
        fileType: newDocument.fileType,
        chunkCount: newDocument.chunkCount,
        fileSize: newDocument.fileSize,
        createdAt: newDocument.createdAt
      }
    });
  } catch (error) {
    console.error('Document Upload/Storage Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during document vector storage'
    });
  }
};

/**
 * Get all uploaded tracked documents
 */
export const getAllDocuments = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        count: 0,
        documents: [],
        dbConnected: false
      });
    }

    const documents = await Document.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
      dbConnected: true
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete a document and its vector chunks
 */
export const deleteDocument = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB is not connected.'
      });
    }

    const { id } = req.params;

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const isPinecone = getVectorDbProvider() === 'pinecone';

    if (isPinecone) {
      // In Pinecone mode: delete vectors from Pinecone FIRST
      const chunks = await Chunk.find({ documentId: id }).select('chunkIndex').lean();
      let chunkIndexes = chunks.map((c) => c.chunkIndex);

      if (!chunkIndexes || chunkIndexes.length === 0) {
        // Fallback to 0..doc.chunkCount - 1
        const count = doc.chunkCount || 0;
        chunkIndexes = Array.from({ length: count }, (_, i) => i);
      }

      try {
        await deleteChunksByDocumentId(id, chunkIndexes);
      } catch (pineconeErr) {
        console.error('Failed to delete vectors from Pinecone:', pineconeErr);
        return res.status(502).json({
          success: false,
          message: `Failed to delete vector embeddings from Pinecone: ${pineconeErr.message}. Document records were preserved in MongoDB so you can retry.`
        });
      }

      // After vectors are deleted from Pinecone, remove from MongoDB
      await Chunk.deleteMany({ documentId: id });
      await Document.findByIdAndDelete(id);
    } else {
      // Atlas Mode: delete associated vector chunks and document in MongoDB
      await Chunk.deleteMany({ documentId: id });
      await Document.findByIdAndDelete(id);
    }

    return res.status(200).json({
      success: true,
      message: `Document "${doc.fileName}" and its vector chunks deleted successfully.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
