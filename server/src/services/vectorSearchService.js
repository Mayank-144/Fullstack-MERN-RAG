import mongoose from 'mongoose';
import Chunk from '../models/Chunk.js';

/**
 * Perform MongoDB Atlas Vector Search using $vectorSearch aggregation stage
 * 
 * @param {number[]} queryVector - 1024-dimensional query embedding from Cohere
 * @param {object} options - Search options
 * @param {number} options.limit - Number of top chunks to retrieve (default: 4)
 * @param {string} [options.documentId] - Optional documentId to search within a specific file
 * @returns {Promise<Array<{ text: string, fileName: string, chunkIndex: number, score: number, documentId: string }>>}
 */
export const searchSimilarChunks = async (
  queryVector,
  { limit = 4, documentId = null } = {}
) => {
  try {
    const filter = {};
    if (documentId) {
      // If user is asking about a specific document
      filter.documentId = new mongoose.Types.ObjectId(documentId);
    }

    const vectorSearchStage = {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryVector,
        numCandidates: Math.max(50, limit * 15),
        limit: limit
      }
    };

    // Add filter if documentId is provided
    if (Object.keys(filter).length > 0) {
      vectorSearchStage.$vectorSearch.filter = filter;
    }

    const pipeline = [
      vectorSearchStage,
      {
        $project: {
          _id: 1,
          documentId: 1,
          fileName: 1,
          chunkIndex: 1,
          text: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    const results = await Chunk.aggregate(pipeline);
    return results;
  } catch (error) {
    console.error('Vector Search Error:', error);
    throw new Error(`Atlas Vector Search failed: ${error.message}`);
  }
};
