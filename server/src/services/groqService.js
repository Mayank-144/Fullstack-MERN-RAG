import Groq from 'groq-sdk';
import {
  RAG_SYSTEM_PROMPT,
  GENERAL_SYSTEM_PROMPT,
  buildRAGPrompt
} from '../utils/prompts.js';

let groqInstance = null;

const getGroqClient = () => {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY is not defined in environment variables. Please add your key to server/.env'
      );
    }
    groqInstance = new Groq({
      apiKey: apiKey
    });
  }
  return groqInstance;
};

/**
 * Generate Direct Answer without RAG context for general questions/fallback
 * 
 * @param {string} query - User question
 * @param {Array} [history=[]] - Previous conversation history
 * @returns {Promise<{ answer: string, model: string }>}
 */
export const generateDirectAnswer = async (query, history = []) => {
  const groq = getGroqClient();
  const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  const messages = [
    {
      role: 'system',
      content: GENERAL_SYSTEM_PROMPT
    },
    ...history.slice(-4).map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    })),
    {
      role: 'user',
      content: query
    }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: modelName,
      temperature: 0.7, // Slightly higher temperature for conversational fluency
      max_tokens: 1500
    });

    const answer =
      chatCompletion.choices[0]?.message?.content ||
      'I am here to help. How can I assist you today?';

    return {
      answer,
      model: modelName,
      usage: chatCompletion.usage
    };
  } catch (error) {
    console.error('Groq Direct LLM Error:', error);
    throw new Error(`Groq LLM failed to generate direct answer: ${error.message}`);
  }
};

/**
 * Generate RAG answer using Groq API
 * 
 * @param {string} query - User question
 * @param {Array} chunks - Retrieved context chunks
 * @param {Array} [history=[]] - Previous conversation history [{ role: 'user'|'assistant', content: string }]
 * @returns {Promise<{ answer: string, sources: Array, model: string }>}
 */
export const generateRAGAnswer = async (query, chunks, history = []) => {
  const groq = getGroqClient();
  const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  // Build the context-rich prompt
  const userPromptWithContext = buildRAGPrompt(query, chunks);

  // Format chat messages
  const messages = [
    {
      role: 'system',
      content: RAG_SYSTEM_PROMPT
    },
    // Optional past messages (last 4 for context)
    ...history.slice(-4).map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    })),
    {
      role: 'user',
      content: userPromptWithContext
    }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: modelName,
      temperature: 0.2, // Low temperature for factual precision
      max_tokens: 1500
    });

    const answer =
      chatCompletion.choices[0]?.message?.content ||
      'No answer could be generated from the model.';

    return {
      answer,
      sources: chunks.map((c) => ({
        fileName: c.fileName,
        chunkIndex: c.chunkIndex,
        text: c.text,
        similarityScore: c.score
      })),
      model: modelName,
      usage: chatCompletion.usage
    };
  } catch (error) {
    console.error('Groq LLM Generation Error:', error);
    throw new Error(`Groq LLM failed to generate answer: ${error.message}`);
  }
};
