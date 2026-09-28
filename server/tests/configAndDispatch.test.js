import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVectorDbProvider,
  isPineconeEnabled,
  isPineconeConfigured,
  _resetPineconeClientForTesting
} from '../src/config/pinecone.js';
import {
  isVectorStoreReady,
  getVectorStoreName
} from '../src/services/vectorSearchService.js';

describe('Pinecone Configuration & Vector Store Dispatch Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    _resetPineconeClientForTesting();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    _resetPineconeClientForTesting();
  });

  test('Default Vector DB Provider is "mongo" when VECTOR_DB is unset or empty', () => {
    delete process.env.VECTOR_DB;
    assert.equal(getVectorDbProvider(), 'mongo');
    assert.equal(isPineconeEnabled(), false);
    assert.equal(getVectorStoreName(), 'MongoDB Atlas');

    process.env.VECTOR_DB = '   ';
    assert.equal(getVectorDbProvider(), 'mongo');
    assert.equal(isPineconeEnabled(), false);
  });

  test('Vector DB Provider is "pinecone" when VECTOR_DB=pinecone (case-insensitive)', () => {
    process.env.VECTOR_DB = 'pinecone';
    assert.equal(getVectorDbProvider(), 'pinecone');
    assert.equal(isPineconeEnabled(), true);
    assert.equal(getVectorStoreName(), 'Pinecone');

    process.env.VECTOR_DB = ' PINECONE ';
    assert.equal(getVectorDbProvider(), 'pinecone');
    assert.equal(isPineconeEnabled(), true);
  });

  test('isPineconeConfigured detects missing, empty, or placeholder keys', () => {
    delete process.env.PINECONE_API_KEY;
    delete process.env.PINECONE_INDEX_NAME;
    assert.equal(isPineconeConfigured(), false);

    // Placeholder values should be treated as not configured
    process.env.PINECONE_API_KEY = 'your_pinecone_api_key';
    process.env.PINECONE_INDEX_NAME = 'rag-index';
    assert.equal(isPineconeConfigured(), false);

    process.env.PINECONE_API_KEY = 'valid-key-123';
    process.env.PINECONE_INDEX_NAME = 'your_index_name';
    assert.equal(isPineconeConfigured(), false);

    // Valid configuration
    process.env.PINECONE_API_KEY = 'pcsk_valid_key_123';
    process.env.PINECONE_INDEX_NAME = 'my-rag-index';
    assert.equal(isPineconeConfigured(), true);
  });

  test('isVectorStoreReady in Pinecone mode checks isPineconeConfigured', () => {
    process.env.VECTOR_DB = 'pinecone';

    delete process.env.PINECONE_API_KEY;
    delete process.env.PINECONE_INDEX_NAME;
    assert.equal(isVectorStoreReady(), false);

    process.env.PINECONE_API_KEY = 'pcsk_test';
    process.env.PINECONE_INDEX_NAME = 'test-index';
    assert.equal(isVectorStoreReady(), true);
  });
});
