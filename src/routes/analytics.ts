import { FastifyPluginAsync } from 'fastify';

const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ metrics: { requests: 0, reports: 0, alerts: 0 }, generatedAt: new Date().toISOString() }));
};

export default analyticsRoutes;
