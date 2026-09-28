import { generateQueryEmbedding } from '../services/cohereService.js';
import {
  searchSimilarChunks,
  isVectorStoreReady,
  getVectorStoreName
} from '../services/vectorSearchService.js';
import { getVectorDbProvider } from '../config/pinecone.js';
import { generateRAGAnswer, generateDirectAnswer } from '../services/groqService.js';

// Minimum similarity score for a chunk to be considered relevant (0.0 to 1.0)
const SIMILARITY_THRESHOLD = 0.65;

/**
 * Handle Full RAG Chat Query with Fallback:
 * 1. Vector Search runs (if vector store is ready)
 * 2. If relevant chunks found (score >= threshold) -> RAG Answer with Citations
 * 3. If no relevant chunks or vector store offline -> Direct LLM Fallback
 */
export const chatQuery = async (req, res) => {
  try {
    const { query, documentId, history = [], limit = 4 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question / query is required'
      });
    }

    const trimmedQuery = query.trim();
    let relevantChunks = [];
    let vectorSearchFailed = false;

    // Check if the configured vector database is ready before querying
    const isStoreReady = isVectorStoreReady();

    if (isStoreReady) {
      try {
        // 1. Generate query embedding using Cohere (search_query mode)
        const queryVector = await generateQueryEmbedding(trimmedQuery);

        // 2. Retrieve top candidate chunks from active vector store (Atlas or Pinecone)
        const candidateChunks = await searchSimilarChunks(queryVector, {
          limit: Number(limit) || 4,
          documentId: documentId || null
        });

        // 3. Filter chunks by similarity threshold
        relevantChunks = candidateChunks.filter(
          (chunk) => chunk.score >= SIMILARITY_THRESHOLD
        );
      } catch (searchErr) {
        console.warn('Vector Search Retrieval warning:', searchErr.message);
        vectorSearchFailed = true;
      }
    } else {
      console.warn(`${getVectorStoreName()} is not ready/configured. Skipping vector search.`);
      vectorSearchFailed = true;
    }

    // 4. Decision: RAG Mode vs Direct LLM Fallback Mode
    if (relevantChunks.length > 0) {
      // High confidence match -> Generate RAG answer grounded in retrieved chunks
      const ragResult = await generateRAGAnswer(trimmedQuery, relevantChunks, history);

      return res.status(200).json({
        success: true,
        query: trimmedQuery,
        answer: ragResult.answer,
        mode: 'RAG',
        ragUsed: true,
        sources: ragResult.sources,
        model: ragResult.model,
        retrievedChunksCount: relevantChunks.length
      });
    } else {
      // If user specifically requested a document search and vector search is offline / failed
      if (documentId && vectorSearchFailed) {
        const isPinecone = getVectorDbProvider() === 'pinecone';
        const message = isPinecone
          ? 'Pinecone connection issue: Unable to search the document. Please ensure your Pinecone API key and Index Name are correctly configured in server/.env.'
          : 'Database connection issue: Unable to search the document. Please ensure your IP address is whitelisted in MongoDB Atlas (Network Access).';

        return res.status(503).json({
          success: false,
          message
        });
      }

      // Low similarity or General question -> Fallback directly to Groq LLM
      const directResult = await generateDirectAnswer(trimmedQuery, history);

      return res.status(200).json({
        success: true,
        query: trimmedQuery,
        answer: directResult.answer,
        mode: 'DIRECT_LLM',
        ragUsed: false,
        sources: [],
        model: directResult.model,
        retrievedChunksCount: 0,
        fallbackReason: vectorSearchFailed
          ? `${getVectorStoreName()} offline - answered with direct Groq LLM`
          : 'No document chunk matched the similarity threshold'
      });
    }
  } catch (error) {
    console.error('Chat Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during answer generation'
    });
  }
};

/**
 * Retrieve raw chunks endpoint for testing retrieval stage
 */
export const retrieveRelevantChunks = async (req, res) => {
  try {
    const { query, documentId, limit = 4 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required for search and retrieval'
      });
    }

    const queryVector = await generateQueryEmbedding(query.trim());
    const relevantChunks = await searchSimilarChunks(queryVector, {
      limit: Number(limit) || 4,
      documentId: documentId || null
    });

    return res.status(200).json({
      success: true,
      query: query.trim(),
      retrievedCount: relevantChunks.length,
      chunks: relevantChunks.map((chunk) => ({
        id: chunk._id,
        fileName: chunk.fileName,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        similarityScore: chunk.score,
        metadata: chunk.metadata
      }))
    });
  } catch (error) {
    console.error('Retrieval Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during vector retrieval'
    });
  }
};
