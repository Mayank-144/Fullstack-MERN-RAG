import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVectorId,
  normalizePineconeScore,
  sanitizeMetadata,
  upsertChunks,
  deleteChunksByIds,
  deleteChunksByDocumentId,
  searchPinecone
} from '../src/services/pineconeService.js';

describe('Pinecone Service Unit Tests (with Fake Index)', () => {
  test('1. Deterministic Vector ID Format', () => {
    const id1 = buildVectorId('doc123', 0);
    assert.equal(id1, 'doc123_0');

    const id2 = buildVectorId('66f001122334455667788990', 42);
    assert.equal(id2, '66f001122334455667788990_42');
  });

  test('2. Score Normalization: Raw Cosine [-1, 1] -> Atlas Format [0, 1]', () => {
    // Atlas score = (1 + cosine) / 2
    assert.equal(normalizePineconeScore(1.0), 1.0);
    assert.equal(normalizePineconeScore(0.3), 0.65);
    assert.equal(normalizePineconeScore(0.0), 0.5);
    assert.equal(normalizePineconeScore(-1.0), 0.0);
    assert.equal(normalizePineconeScore(-0.3), 0.35);

    // Edge / invalid cases
    assert.equal(normalizePineconeScore(undefined), 0);
    assert.equal(normalizePineconeScore(NaN), 0);
    assert.equal(normalizePineconeScore(null), 0);
  });

  test('3. Sanitize Metadata: Never contains undefined or null values', () => {
    const rawData = {
      documentId: 'doc_abc',
      fileName: 'test.pdf',
      chunkIndex: 2,
      text: 'Hello world',
      charCount: undefined,
      tokenEstimate: null
    };

    const sanitized = sanitizeMetadata(rawData);
    assert.equal(sanitized.documentId, 'doc_abc');
    assert.equal(sanitized.fileName, 'test.pdf');
    assert.equal(sanitized.chunkIndex, 2);
    assert.equal(sanitized.text, 'Hello world');
    assert.equal('charCount' in sanitized, false);
    assert.equal('tokenEstimate' in sanitized, false);

    for (const [key, value] of Object.entries(sanitized)) {
      assert.notEqual(value, undefined, `Key ${key} should not be undefined`);
      assert.notEqual(value, null, `Key ${key} should not be null`);
    }
  });

  test('4. Upsert Batching: 250 records batched into [100, 100, 50]', async () => {
    const upsertBatches = [];
    const fakeIndex = {
      upsert: async (batch) => {
        upsertBatches.push(batch);
      }
    };

    const testRecords = Array.from({ length: 250 }, (_, i) => ({
      documentId: 'doc1',
      fileName: 'sample.pdf',
      chunkIndex: i,
      text: `Chunk text ${i}`,
      embedding: Array(1024).fill(0.01),
      charCount: 15,
      tokenEstimate: 4
    }));

    const count = await upsertChunks(testRecords, fakeIndex);
    assert.equal(count, 250);
    assert.equal(upsertBatches.length, 3);
    assert.equal(upsertBatches[0].length, 100);
    assert.equal(upsertBatches[1].length, 100);
    assert.equal(upsertBatches[2].length, 50);

    // Check first record format
    assert.equal(upsertBatches[0][0].id, 'doc1_0');
    assert.equal(upsertBatches[0][0].metadata.chunkIndex, 0);
  });

  test('5. Delete Batching: 2500 IDs batched into [1000, 1000, 500]', async () => {
    const deleteBatches = [];
    const fakeIndex = {
      deleteMany: async (batch) => {
        deleteBatches.push(batch);
      }
    };

    const testIds = Array.from({ length: 2500 }, (_, i) => `docX_${i}`);
    await deleteChunksByIds(testIds, fakeIndex);

    assert.equal(deleteBatches.length, 3);
    assert.equal(deleteBatches[0].length, 1000);
    assert.equal(deleteBatches[1].length, 1000);
    assert.equal(deleteBatches[2].length, 500);
    assert.equal(deleteBatches[0][0], 'docX_0');
    assert.equal(deleteBatches[2][499], 'docX_2499');
  });

  test('6. Delete by Document ID and Chunk Indexes', async () => {
    let deletedIds = [];
    const fakeIndex = {
      deleteMany: async (batch) => {
        deletedIds.push(...batch);
      }
    };

    await deleteChunksByDocumentId('doc999', [0, 1, 2], fakeIndex);
    assert.deepEqual(deletedIds, ['doc999_0', 'doc999_1', 'doc999_2']);
  });

  test('7. Query Filter: Scoped search includes filter, Global search has no filter', async () => {
    let capturedOptions = null;
    const fakeIndex = {
      query: async (options) => {
        capturedOptions = options;
        return { matches: [] };
      }
    };

    const dummyVector = Array(1024).fill(0.05);

    // Scoped query
    await searchPinecone(dummyVector, { limit: 5, documentId: 'doc_target' }, fakeIndex);
    assert.equal(capturedOptions.topK, 5);
    assert.equal(capturedOptions.includeMetadata, true);
    assert.deepEqual(capturedOptions.filter, {
      documentId: { $eq: 'doc_target' }
    });

    // Global query
    await searchPinecone(dummyVector, { limit: 3, documentId: null }, fakeIndex);
    assert.equal(capturedOptions.topK, 3);
    assert.equal(capturedOptions.filter, undefined);
  });

  test('8. Result Shape: Matches MongoDB Atlas search output exactly', async () => {
    const fakeIndex = {
      query: async () => ({
        matches: [
          {
            id: 'doc123_4',
            score: 0.3, // normalized: (0.3 + 1) / 2 = 0.65
            metadata: {
              documentId: 'doc123',
              fileName: 'contract.pdf',
              chunkIndex: 4,
              text: 'This agreement is between...',
              charCount: 28,
              tokenEstimate: 7
            }
          }
        ]
      })
    };

    const results = await searchPinecone(Array(1024).fill(0), { limit: 1 }, fakeIndex);
    assert.equal(results.length, 1);

    const first = results[0];
    assert.equal(first._id, 'doc123_4');
    assert.equal(first.documentId, 'doc123');
    assert.equal(first.fileName, 'contract.pdf');
    assert.equal(first.chunkIndex, 4);
    assert.equal(first.text, 'This agreement is between...');
    assert.equal(first.score, 0.65);
    assert.deepEqual(first.metadata, {
      charCount: 28,
      tokenEstimate: 7
    });
  });
});
