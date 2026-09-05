import cors from '@fastify/cors';
import { FastifyPluginAsync } from 'fastify';

const corsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(cors, { origin: true });
};

export default corsPlugin;
