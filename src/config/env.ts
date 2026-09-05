import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  PYTHON_AI_URL: z.string().url().default('http://127.0.0.1:8000'),
  OPENAQ_API_KEY: z.string().optional(),
  NASA_FIRMS_MAP_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional()
});

export const env = schema.parse(process.env);
export const hasFirebaseConfig = Boolean(
  env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY
);
