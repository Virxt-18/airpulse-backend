import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  PYTHON_AI_URL: z.string().url().default('https://airpulse-backend-1-dsjb.onrender.com'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  AQICN_TOKEN: z.string().optional(),
  NASA_FIRMS_MAP_KEY: z.string().optional(),
  NASA_FIRMS: z.string().optional(), // legacy alias
  INDIA_BBOX: z.string().default('68.0,6.5,97.5,37.5'),
  UPLOAD_DIR: z.string().default('uploads'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional()
});

const parsed = schema.parse(process.env);

export const env = { ...parsed, NASA_FIRMS_MAP_KEY: parsed.NASA_FIRMS_MAP_KEY || parsed.NASA_FIRMS };
export const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
export const hasFirebaseConfig = Boolean(
  env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY
);
