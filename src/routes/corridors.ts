import { FastifyPluginAsync } from 'fastify';
import { getCorridorForecasts } from '../services/corridorService';

const corridorRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => getCorridorForecasts());
  app.post('/refresh', async () => getCorridorForecasts({ refresh: true }));
};

export default corridorRoutes;