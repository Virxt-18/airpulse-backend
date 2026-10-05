import { FastifyPluginAsync } from 'fastify';
import { getCurrentAirQuality } from '../services/airQualityService';

type AirQualityQuery = { location?: string; latitude?: string; longitude?: string };

const airQualityRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: AirQualityQuery }>('/', async (request, reply) => {
    const { location, latitude, longitude } = request.query;
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!location && (!Number.isFinite(lat) || !Number.isFinite(lon))) {
      return reply.code(400).send({ error: 'Provide a location or a latitude/longitude pair' });
    }
    return getCurrentAirQuality(
      location?.trim(),
      Number.isFinite(lat) ? lat : undefined,
      Number.isFinite(lon) ? lon : undefined
    );
  });
};

export default airQualityRoutes;
