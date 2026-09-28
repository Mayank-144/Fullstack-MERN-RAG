import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import mongoose from 'mongoose';
import Chunk from '../src/models/Chunk.js';
import { isPineconeConfigured } from '../src/config/pinecone.js';
import { upsertChunks } from '../src/services/pineconeService.js';

const BATCH_SIZE = 100;

const migrateMongoToPinecone = async () => {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🔄 Starting MongoDB -> Pinecone Vector Migration...');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE enabled. No changes will be written to Pinecone.');
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not defined in server/.env');
    process.exit(1);
  }

  if (!isDryRun && !isPineconeConfigured()) {
    console.error(
      '❌ Pinecone is not configured. Please set PINECONE_API_KEY and PINECONE_INDEX_NAME in server/.env'
    );
    process.exit(1);
  }

  try {
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB.');

    // Find all chunks in MongoDB that have embeddings
    const query = { 'embedding.0': { $exists: true } };
    const totalMatching = await Chunk.countDocuments(query);

    console.log(`📊 Found ${totalMatching} chunk(s) with embeddings in MongoDB.`);

    if (totalMatching === 0) {
      console.log('ℹ️ No chunks found with embeddings. Nothing to migrate.');
      await mongoose.disconnect();
      process.exit(0);
    }

    if (isDryRun) {
      console.log(`✅ Dry run complete: ${totalMatching} chunk(s) would be migrated to Pinecone in ${Math.ceil(totalMatching / BATCH_SIZE)} batch(es).`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const cursor = Chunk.find(query).cursor();
    let currentBatch = [];
    let totalMigrated = 0;

    for await (const doc of cursor) {
      currentBatch.push({
        documentId: doc.documentId.toString(),
        fileName: doc.fileName,
        chunkIndex: doc.chunkIndex,
        text: doc.text,
        embedding: doc.embedding,
        charCount: doc.metadata?.charCount,
        tokenEstimate: doc.metadata?.tokenEstimate
      });

      if (currentBatch.length >= BATCH_SIZE) {
        await upsertChunks(currentBatch);
        totalMigrated += currentBatch.length;
        console.log(`⏳ Progress: Migrated ${totalMigrated} / ${totalMatching} chunks...`);
        currentBatch = [];
      }
    }

    if (currentBatch.length > 0) {
      await upsertChunks(currentBatch);
      totalMigrated += currentBatch.length;
      console.log(`⏳ Progress: Migrated ${totalMigrated} / ${totalMatching} chunks...`);
    }

    console.log(`🎉 Migration successfully completed! Total chunks migrated to Pinecone: ${totalMigrated}.`);
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    try {
      await mongoose.connection.close();
    } catch {}
    process.exit(1);
  }
};

migrateMongoToPinecone();
