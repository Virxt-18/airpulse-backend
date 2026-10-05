import { FastifyPluginAsync } from 'fastify';
import { listHotspots, detectHotspots } from '../services/hotspotService';

const hotspotRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { location?: string } }>('/', async (request) => listHotspots(request.query.location));
  // Force a fresh satellite + sensor fusion pass instead of the 5 minute cache.
  app.post('/detect', async () => ({ hotspots: await detectHotspots({ refresh: true }) }));
};

export default hotspotRoutes;