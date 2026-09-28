import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Pinecone } from '@pinecone-database/pinecone';
import {
  _resetPineconeClientForTesting
} from '../src/config/pinecone.js';
import {
  upsertChunks,
  searchPinecone,
  deleteChunksByIds
} from '../src/services/pineconeService.js';

describe('Pinecone Real SDK Integration Test with Local HTTP Mock Server', () => {
  let server;
  let serverPort;
  let serverUrl;
  const requestsReceived = [];

  before(async () => {
    // Start local HTTP server to mock Pinecone Vector Data API
    await new Promise((resolve) => {
      server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          const parsedBody = body ? JSON.parse(body) : {};
          requestsReceived.push({
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: parsedBody
          });

          res.setHeader('Content-Type', 'application/json');

          if (req.url.includes('/vectors/upsert')) {
            res.writeHead(200);
            res.end(JSON.stringify({ upsertedCount: parsedBody.vectors?.length || 0 }));
          } else if (req.url.includes('/query')) {
            res.writeHead(200);
            res.end(
              JSON.stringify({
                matches: [
                  {
                    id: 'mockDoc_0',
                    score: 0.8,
                    values: [],
                    metadata: {
                      documentId: 'mockDoc',
                      fileName: 'resume.pdf',
                      chunkIndex: 0,
                      text: 'Software Engineer with experience in RAG and Pinecone',
                      charCount: 52,
                      tokenEstimate: 13
                    }
                  }
                ],
                namespace: ''
              })
            );
          } else if (req.url.includes('/vectors/delete')) {
            res.writeHead(200);
            res.end(JSON.stringify({}));
          } else {
            res.writeHead(200);
            res.end(JSON.stringify({}));
          }
        });
      });

      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        serverUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    _resetPineconeClientForTesting();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('Real Pinecone SDK performs upsert, query, and delete operations against mock host', async () => {
    // Instantiate real Pinecone SDK client with mock host
    const pc = new Pinecone({
      apiKey: 'test-mock-api-key'
    });

    const mockIndex = pc.index('test-index', serverUrl);

    // 1. Test Upsert with Real Pinecone SDK
    const testChunks = [
      {
        documentId: 'mockDoc',
        fileName: 'resume.pdf',
        chunkIndex: 0,
        text: 'Software Engineer with experience in RAG and Pinecone',
        embedding: Array(1024).fill(0.02),
        charCount: 52,
        tokenEstimate: 13
      }
    ];

    const upsertCount = await upsertChunks(testChunks, mockIndex);
    assert.equal(upsertCount, 1);

    // Verify HTTP request received by mock server for upsert
    const upsertReq = requestsReceived.find((r) => r.url.includes('/vectors/upsert'));
    assert.ok(upsertReq, 'Mock server should receive /vectors/upsert request');
    assert.equal(upsertReq.method, 'POST');
    assert.equal(upsertReq.body.vectors.length, 1);
    assert.equal(upsertReq.body.vectors[0].id, 'mockDoc_0');
    assert.equal(upsertReq.body.vectors[0].metadata.fileName, 'resume.pdf');

    // 2. Test Query with Real Pinecone SDK
    const queryVector = Array(1024).fill(0.01);
    const searchResults = await searchPinecone(
      queryVector,
      { limit: 2, documentId: 'mockDoc' },
      mockIndex
    );

    assert.equal(searchResults.length, 1);
    assert.equal(searchResults[0]._id, 'mockDoc_0');
    assert.equal(searchResults[0].documentId, 'mockDoc');
    assert.equal(searchResults[0].fileName, 'resume.pdf');
    // Normalized score: (0.8 + 1) / 2 = 0.9
    assert.equal(searchResults[0].score, 0.9);

    // Verify HTTP request received by mock server for query
    const queryReq = requestsReceived.find((r) => r.url.includes('/query'));
    assert.ok(queryReq, 'Mock server should receive /query request');
    assert.equal(queryReq.method, 'POST');
    assert.equal(queryReq.body.topK, 2);
    assert.equal(queryReq.body.includeMetadata, true);
    assert.deepEqual(queryReq.body.filter, { documentId: { $eq: 'mockDoc' } });

    // 3. Test Delete with Real Pinecone SDK
    await deleteChunksByIds(['mockDoc_0'], mockIndex);

    // Verify HTTP request received by mock server for delete
    const deleteReq = requestsReceived.find((r) => r.url.includes('/vectors/delete'));
    assert.ok(deleteReq, 'Mock server should receive /vectors/delete request');
    assert.equal(deleteReq.method, 'POST');
    assert.deepEqual(deleteReq.body.ids, ['mockDoc_0']);
  });
});
