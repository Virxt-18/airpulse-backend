import { FastifyPluginAsync } from 'fastify';
import { listHotspots } from '../services/hotspotService';

const hotspotRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => listHotspots());
};

export default hotspotRoutes;
