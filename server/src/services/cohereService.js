import { CohereClient } from 'cohere-ai';

// Initialize Cohere Client (lazy initialization helper)
let cohereInstance = null;

const getCohereClient = () => {
  if (!cohereInstance) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'COHERE_API_KEY is not defined in environment variables. Please add your key to server/.env'
      );
    }
    cohereInstance = new CohereClient({
      token: apiKey
    });
  }
  return cohereInstance;
};

/**
 * Generate Embeddings for an array of text chunks using Cohere Embed v3
 * 
 * @param {string[]} texts - Array of chunk text strings
 * @param {'search_document' | 'search_query'} inputType - 'search_document' for chunks, 'search_query' for queries
 * @param {string} model - Cohere embedding model (default: 'embed-english-v3.0' or 'embed-multilingual-v3.0')
 * @returns {Promise<number[][]>} - Array of 1024-dimensional float embedding vectors
 */
export const generateEmbeddings = async (
  texts,
  inputType = 'search_document',
  model = 'embed-english-v3.0'
) => {
  if (!texts || texts.length === 0) {
    return [];
  }

  const cohere = getCohereClient();
  const BATCH_SIZE = 96; // Cohere API max batch limit per call
  const allEmbeddings = [];

  // Process in batches of 96 to handle large documents safely
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    try {
      const response = await cohere.embed({
        texts: batch,
        model,
        inputType,
        embeddingTypes: ['float']
      });

      // Cohere Embed v3 returns embeddings in response.embeddings.float or response.embeddings
      let batchEmbeddings = [];
      if (response.embeddings && response.embeddings.float) {
        batchEmbeddings = response.embeddings.float;
      } else if (Array.isArray(response.embeddings)) {
        batchEmbeddings = response.embeddings;
      } else {
        throw new Error('Unexpected embedding response format from Cohere API');
      }

      allEmbeddings.push(...batchEmbeddings);
    } catch (error) {
      console.error(`Cohere Embedding Error in batch (${i} to ${i + batch.length}):`, error);
      throw new Error(`Failed to generate Cohere embeddings: ${error.message}`);
    }
  }

  return allEmbeddings;
};

/**
 * Generate a single query embedding for vector similarity search
 * 
 * @param {string} query - User search question
 * @returns {Promise<number[]>} - 1024-dimensional embedding vector
 */
export const generateQueryEmbedding = async (query) => {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query string is required to generate query embedding');
  }

  const embeddings = await generateEmbeddings(
    [query.trim()],
    'search_query'
  );

  return embeddings[0];
};
