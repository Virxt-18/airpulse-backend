import cors from '@fastify/cors';
import { FastifyPluginAsync } from 'fastify';
import { corsOrigins } from '../config/env';

const corsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
};

export default corsPlugin;
