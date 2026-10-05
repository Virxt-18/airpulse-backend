import { FastifyPluginAsync } from 'fastify';
import { getDataHealth } from '../services/dataHealthService';

const dataHealthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => getDataHealth());
};

export default dataHealthRoutes;