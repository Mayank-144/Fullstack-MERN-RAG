import Document from '../models/Document.js';
import Chunk from '../models/Chunk.js';
import { parseDocument } from '../services/parserService.js';
import { splitIntoChunks } from '../services/chunkService.js';
import { generateEmbeddings } from '../services/cohereService.js';

/**
 * Upload, parse, chunk, embed, and store document in MongoDB Atlas Vector Search
 */
export const uploadDocument = async (req, res) => {
  try {
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

    // Step 5: Prepare chunks with vector embeddings and metadata for bulk insert
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

    // Step 6: Store in MongoDB Chunks collection
    await Chunk.insertMany(chunkDocuments);

    return res.status(201).json({
      success: true,
      message: `File "${originalname}" processed and stored in Vector DB successfully!`,
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
    const documents = await Document.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: documents.length,
      documents
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
    const { id } = req.params;

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete associated vector chunks
    await Chunk.deleteMany({ documentId: id });
    await Document.findByIdAndDelete(id);

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
