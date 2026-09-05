import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ status: 'ok', service: 'airpulse-backend', firebase: app.firebaseEnabled }));
};

export default healthRoutes;
