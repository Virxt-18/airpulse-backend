import { FastifyPluginAsync } from 'fastify';
import { getAnalytics } from '../services/analyticsService';

const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { location?: string } }>('/', async (request) => getAnalytics(request.query.location));
};

export default analyticsRoutes;