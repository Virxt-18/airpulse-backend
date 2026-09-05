import { FastifyPluginAsync } from 'fastify';
import { getOverview } from '../controllers/overviewController';

const overviewRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => getOverview());
};

export default overviewRoutes;
