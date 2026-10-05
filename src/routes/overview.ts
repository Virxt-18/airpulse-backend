import { FastifyPluginAsync } from 'fastify';
import { getOverview } from '../services/overviewService';

const overviewRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { location?: string } }>('/', async (request) => getOverview(request.query.location));
};

export default overviewRoutes;
