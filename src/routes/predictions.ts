import { FastifyPluginAsync } from 'fastify';
import { predictAirQuality } from '../services/predictionService';

const predictionRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { location?: string; latitude?: string; longitude?: string; horizonHours?: string } }>('/', async (request, reply) => {
    const toNumber = (value?: string) => (value !== undefined && Number.isFinite(Number(value)) ? Number(value) : undefined);
    const location = request.query.location?.trim();
    if (!location && (toNumber(request.query.latitude) === undefined || toNumber(request.query.longitude) === undefined)) {
      return reply.code(400).send({ error: 'Provide a location or a latitude/longitude pair' });
    }
    return predictAirQuality(
      location || 'Bengaluru',
      toNumber(request.query.horizonHours) ?? 24,
      toNumber(request.query.latitude),
      toNumber(request.query.longitude)
    );
  });
};

export default predictionRoutes;