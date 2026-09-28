import dotenv from 'dotenv';
dotenv.config();

import {
  isPineconeConfigured,
  getPineconeClient
} from '../src/config/pinecone.js';

const setupPineconeIndex = async () => {
  console.log('🔍 Checking Pinecone index configuration...');

  if (!isPineconeConfigured()) {
    console.error(
      '❌ Pinecone is not properly configured. Please set PINECONE_API_KEY and PINECONE_INDEX_NAME in server/.env'
    );
    process.exit(1);
  }

  const indexName = process.env.PINECONE_INDEX_NAME.trim();
  const cloud = process.env.PINECONE_CLOUD?.trim() || 'aws';
  const region = process.env.PINECONE_REGION?.trim() || 'us-east-1';
  const REQUIRED_DIMENSION = 1024;
  const REQUIRED_METRIC = 'cosine';

  try {
    const pc = getPineconeClient();
    const indexListResponse = await pc.listIndexes();
    const existingIndexes = indexListResponse?.indexes || [];

    const existingIndex = existingIndexes.find((idx) => idx.name === indexName);

    if (existingIndex) {
      console.log(`ℹ️ Index "${indexName}" already exists.`);

      const dimMatches = existingIndex.dimension === REQUIRED_DIMENSION;
      const metricMatches = (existingIndex.metric || '').toLowerCase() === REQUIRED_METRIC;

      if (!dimMatches || !metricMatches) {
        console.error(
          `❌ Configuration Mismatch: Index "${indexName}" exists with dimension ${existingIndex.dimension} and metric "${existingIndex.metric}".\n` +
          `   Expected: dimension ${REQUIRED_DIMENSION} and metric "${REQUIRED_METRIC}".\n` +
          `   Please delete the existing index or choose a different PINECONE_INDEX_NAME in server/.env.`
        );
        process.exit(1);
      }

      console.log(
        `✅ Index "${indexName}" is valid and ready (Dimension: ${existingIndex.dimension}, Metric: ${existingIndex.metric}, Status: ${existingIndex.status?.state || 'Ready'}).`
      );
      process.exit(0);
    }

    console.log(
      `🚀 Creating serverless Pinecone index "${indexName}" (Dimension: ${REQUIRED_DIMENSION}, Metric: ${REQUIRED_METRIC}, Cloud: ${cloud}, Region: ${region})...`
    );

    await pc.createIndex({
      name: indexName,
      dimension: REQUIRED_DIMENSION,
      metric: REQUIRED_METRIC,
      spec: {
        serverless: {
          cloud: cloud,
          region: region
        }
      },
      waitUntilReady: true
    });

    console.log(`✅ Pinecone index "${indexName}" created successfully and is ready to use!`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to setup Pinecone index:`, error.message);
    process.exit(1);
  }
};

setupPineconeIndex();
