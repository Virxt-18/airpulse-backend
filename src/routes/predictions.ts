import { FastifyPluginAsync } from 'fastify';
import { getPrediction } from '../controllers/predictionController';

const predictionRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { location?: string; horizonHours?: string } }>('/', async (request) => {
    const horizon = request.query.horizonHours ? Number(request.query.horizonHours) : undefined;
    return getPrediction(request.query.location, horizon);
  });
};

export default predictionRoutes;
