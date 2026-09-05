import { FastifyPluginAsync } from 'fastify';
import { getAirQuality } from '../controllers/airQualityController';

const airQualityRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { location?: string } }>('/', async (request) => getAirQuality(request.query.location));
};

export default airQualityRoutes;
