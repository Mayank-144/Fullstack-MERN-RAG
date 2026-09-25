import express from 'express';
import {
  chatQuery,
  retrieveRelevantChunks
} from '../controllers/chatController.js';

const router = express.Router();

/**
 * @route   POST /api/chat/message
 * @desc    Full RAG Chat endpoint (Vector Retrieval + Groq LLM Generation)
 */
router.post('/message', chatQuery);

/**
 * @route   POST /api/chat/retrieve
 * @desc    Generate query embedding & fetch top similar vector chunks only
 */
router.post('/retrieve', retrieveRelevantChunks);

export default router;
