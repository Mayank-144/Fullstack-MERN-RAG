import mongoose from 'mongoose';
import Chunk from '../models/Chunk.js';
import { getVectorDbProvider, isPineconeConfigured } from '../config/pinecone.js';
import { searchPinecone } from './pineconeService.js';

/**
 * Perform MongoDB Atlas Vector Search using $vectorSearch aggregation stage
 * @private
 * @param {number[]} queryVector - 1024-dimensional query embedding from Cohere
 * @param {object} options
 * @param {number} options.limit
 * @param {string} [options.documentId]
 * @returns {Promise<Array<{ _id: any, text: string, fileName: string, chunkIndex: number, score: number, documentId: any, metadata: object }>>}
 */
const searchMongoSimilarChunks = async (
  queryVector,
  { limit = 4, documentId = null } = {}
) => {
  try {
    const filter = {};
    if (documentId) {
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
    console.error('Atlas Vector Search Error:', error);
    throw new Error(`Atlas Vector Search failed: ${error.message}`);
  }
};

/**
 * Check if the active vector store is ready to serve queries
 * @returns {boolean}
 */
export const isVectorStoreReady = () => {
  const provider = getVectorDbProvider();
  if (provider === 'pinecone') {
    return isPineconeConfigured();
  }
  return mongoose.connection.readyState === 1;
};

/**
 * Returns human-readable name of the active vector database
 * @returns {string}
 */
export const getVectorStoreName = () => {
  const provider = getVectorDbProvider();
  return provider === 'pinecone' ? 'Pinecone' : 'MongoDB Atlas';
};

/**
 * Unified vector similarity search - dispatches to either MongoDB Atlas or Pinecone
 * based on the VECTOR_DB configuration
 * 
 * @param {number[]} queryVector - 1024-dimensional embedding vector
 * @param {object} options
 * @param {number} [options.limit=4] - Top K candidate chunks
 * @param {string} [options.documentId=null] - Scoped search to document
 * @returns {Promise<Array<{ _id: any, text: string, fileName: string, chunkIndex: number, score: number, documentId: any, metadata: object }>>}
 */
export const searchSimilarChunks = async (
  queryVector,
  { limit = 4, documentId = null } = {}
) => {
  const provider = getVectorDbProvider();

  if (provider === 'pinecone') {
    return searchPinecone(queryVector, { limit, documentId });
  }

  return searchMongoSimilarChunks(queryVector, { limit, documentId });
};
