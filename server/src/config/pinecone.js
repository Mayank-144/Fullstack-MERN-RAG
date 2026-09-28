import { Pinecone } from '@pinecone-database/pinecone';

// Lazy singleton instances
let pineconeClient = null;
let pineconeIndex = null;

/**
 * Returns active Vector DB Provider ('mongo' by default, or 'pinecone')
 * @returns {'mongo' | 'pinecone'}
 */
export const getVectorDbProvider = () => {
  const provider = (process.env.VECTOR_DB || 'mongo').trim().toLowerCase();
  return provider === 'pinecone' ? 'pinecone' : 'mongo';
};

/**
 * Checks if Pinecone is explicitly selected as the vector database provider
 * @returns {boolean}
 */
export const isPineconeEnabled = () => {
  return getVectorDbProvider() === 'pinecone';
};

/**
 * Checks if a string value is a valid non-placeholder configuration value
 * @param {string} [val]
 * @returns {boolean}
 */
const isValidConfigValue = (val) => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length === 0) return false;
  if (/^your[_-]/i.test(trimmed) || trimmed.toLowerCase() === 'your_api_key' || trimmed.toLowerCase() === 'your_index_name') {
    return false;
  }
  return true;
};

/**
 * Checks if Pinecone environment variables are properly configured
 * @returns {boolean}
 */
export const isPineconeConfigured = () => {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  return isValidConfigValue(apiKey) && isValidConfigValue(indexName);
};

/**
 * Get or initialize the Pinecone Client instance
 * @returns {Pinecone}
 */
export const getPineconeClient = () => {
  if (!pineconeClient) {
    if (!isPineconeConfigured()) {
      throw new Error(
        'Pinecone is not properly configured. Please set PINECONE_API_KEY and PINECONE_INDEX_NAME in your server/.env file.'
      );
    }
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY.trim()
    });
  }
  return pineconeClient;
};

/**
 * Get or initialize the Pinecone Index handle
 * Supports optional PINECONE_NAMESPACE and PINECONE_INDEX_HOST overrides.
 * @returns {import('@pinecone-database/pinecone').Index}
 */
export const getPineconeIndex = () => {
  if (!pineconeIndex) {
    const client = getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME.trim();
    const host = process.env.PINECONE_INDEX_HOST?.trim() || undefined;
    const namespace = process.env.PINECONE_NAMESPACE?.trim() || undefined;

    let targetIndex = host ? client.index(indexName, host) : client.index(indexName);

    if (namespace) {
      targetIndex = targetIndex.namespace(namespace);
    }

    pineconeIndex = targetIndex;
  }
  return pineconeIndex;
};

/**
 * Reset cached singleton instances (useful for testing or dynamic config changes)
 */
export const _resetPineconeClientForTesting = () => {
  pineconeClient = null;
  pineconeIndex = null;
};
