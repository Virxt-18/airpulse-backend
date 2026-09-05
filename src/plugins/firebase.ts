import { FastifyPluginAsync } from 'fastify';
import { hasFirebaseConfig } from '../config/env';

declare module 'fastify' {
  interface FastifyInstance { firebaseEnabled: boolean }
}

const firebasePlugin: FastifyPluginAsync = async (app) => {
  app.decorate('firebaseEnabled', hasFirebaseConfig);
};

export default firebasePlugin;
