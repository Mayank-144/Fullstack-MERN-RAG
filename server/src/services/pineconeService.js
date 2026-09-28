import { getPineconeIndex } from '../config/pinecone.js';

const UPSERT_BATCH_SIZE = 100;
const DELETE_BATCH_SIZE = 1000;

/**
 * Deterministic vector ID generator for Pinecone records
 * @param {string} documentId
 * @param {number} chunkIndex
 * @returns {string}
 */
export const buildVectorId = (documentId, chunkIndex) => {
  return `${String(documentId)}_${chunkIndex}`;
};

/**
 * Normalizes Pinecone cosine similarity score [-1, 1] to MongoDB Atlas format [0, 1]
 * Atlas uses: (1 + cosine) / 2
 * @param {number} [rawScore]
 * @returns {number}
 */
export const normalizePineconeScore = (rawScore) => {
  if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) {
    return 0;
  }
  const normalized = (rawScore + 1) / 2;
  return Math.max(0, Math.min(1, normalized));
};

/**
 * Sanitize metadata to ensure Pinecone does not reject null or undefined properties
 * @param {object} meta
 * @returns {Record<string, string | number | boolean | string[]>}
 */
export const sanitizeMetadata = ({
  documentId,
  fileName,
  chunkIndex,
  text,
  charCount,
  tokenEstimate
}) => {
  const metadata = {
    documentId: String(documentId),
    fileName: String(fileName || ''),
    chunkIndex: Number(chunkIndex) || 0,
    text: String(text || '')
  };

  if (charCount !== undefined && charCount !== null && !Number.isNaN(Number(charCount))) {
    metadata.charCount = Number(charCount);
  }

  if (tokenEstimate !== undefined && tokenEstimate !== null && !Number.isNaN(Number(tokenEstimate))) {
    metadata.tokenEstimate = Number(tokenEstimate);
  }

  return metadata;
};

/**
 * Upsert chunk vectors and metadata to Pinecone in batches of 100
 * @param {Array<{ documentId: string, fileName: string, chunkIndex: number, text: string, embedding: number[], charCount?: number, tokenEstimate?: number }>} chunks
 * @param {object} [indexOverride] - Optional injected Pinecone index instance (for testing)
 * @returns {Promise<number>} - Total count of vectors upserted
 */
export const upsertChunks = async (chunks, indexOverride = null) => {
  if (!chunks || chunks.length === 0) {
    return 0;
  }

  const index = indexOverride || getPineconeIndex();

  const records = chunks.map((chunk) => ({
    id: buildVectorId(chunk.documentId, chunk.chunkIndex),
    values: chunk.embedding,
    metadata: sanitizeMetadata(chunk)
  }));

  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    const batch = records.slice(i, i + UPSERT_BATCH_SIZE);
    await index.upsert(batch);
  }

  return records.length;
};

/**
 * Delete vector records from Pinecone by list of ID strings in batches of 1000
 * @param {string[]} ids
 * @param {object} [indexOverride]
 * @returns {Promise<void>}
 */
export const deleteChunksByIds = async (ids, indexOverride = null) => {
  if (!ids || ids.length === 0) {
    return;
  }

  const index = indexOverride || getPineconeIndex();

  for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
    const batch = ids.slice(i, i + DELETE_BATCH_SIZE);
    await index.deleteMany(batch);
  }
};

/**
 * Delete vector records belonging to a specific document by its chunk indexes
 * @param {string} documentId
 * @param {number[]} chunkIndexes
 * @param {object} [indexOverride]
 * @returns {Promise<void>}
 */
export const deleteChunksByDocumentId = async (
  documentId,
  chunkIndexes = [],
  indexOverride = null
) => {
  if (!documentId) return;

  const ids = chunkIndexes.map((idx) => buildVectorId(documentId, idx));
  await deleteChunksByIds(ids, indexOverride);
};

/**
 * Query Pinecone for similar vectors and return in MongoDB Atlas shape
 * @param {number[]} queryVector - 1024-dimensional query embedding
 * @param {object} [options]
 * @param {number} [options.limit=4] - Top K matches
 * @param {string} [options.documentId=null] - Filter search to a specific document
 * @param {object} [indexOverride] - Optional injected Pinecone index instance
 * @returns {Promise<Array<{ _id: string, documentId: string, fileName: string, chunkIndex: number, text: string, metadata: object, score: number }>>}
 */
export const searchPinecone = async (
  queryVector,
  { limit = 4, documentId = null } = {},
  indexOverride = null
) => {
  const index = indexOverride || getPineconeIndex();

  const queryOptions = {
    vector: queryVector,
    topK: Number(limit) || 4,
    includeMetadata: true
  };

  if (documentId) {
    queryOptions.filter = {
      documentId: { $eq: String(documentId) }
    };
  }

  const response = await index.query(queryOptions);
  const matches = response?.matches || [];

  return matches.map((match) => ({
    _id: match.id,
    documentId: match.metadata?.documentId || null,
    fileName: match.metadata?.fileName || '',
    chunkIndex: typeof match.metadata?.chunkIndex === 'number' ? match.metadata.chunkIndex : 0,
    text: match.metadata?.text || '',
    metadata: {
      charCount: match.metadata?.charCount ?? (match.metadata?.text ? match.metadata.text.length : 0),
      tokenEstimate: match.metadata?.tokenEstimate ?? 0
    },
    score: normalizePineconeScore(match.score)
  }));
};
