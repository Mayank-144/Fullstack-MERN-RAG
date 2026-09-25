import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

/**
 * Serverless handler entry point for Vercel deployment
 */
export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
