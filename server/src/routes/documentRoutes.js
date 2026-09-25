import express from 'express';
import { upload } from '../middlewares/upload.js';
import {
  uploadDocument,
  getAllDocuments,
  deleteDocument
} from '../controllers/documentController.js';

const router = express.Router();

/**
 * @route   POST /api/documents/upload
 * @desc    Upload, chunk, embed and store PDF or Excel file
 */
router.post('/upload', upload.single('file'), uploadDocument);

/**
 * @route   GET /api/documents
 * @desc    Get all uploaded files
 */
router.get('/', getAllDocuments);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document and its vector chunks
 */
router.delete('/:id', deleteDocument);

export default router;
