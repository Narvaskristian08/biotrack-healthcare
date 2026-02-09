import OpenAI from 'openai';
import { env } from '../../config/env.js';

export const aiClient = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'BioTrack Capstone',
  },
});
