import { FastifyPluginAsync } from 'fastify';
import { reverseGeocode, searchCities } from '../services/geocodingService';

const geocodingRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { latitude?: string; longitude?: string } }>('/reverse', async (request, reply) => {
    const latitude = Number(request.query.latitude);
    const longitude = Number(request.query.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return reply.code(400).send({ error: 'valid latitude and longitude are required' });
    }
    return reverseGeocode(latitude, longitude);
  });
  app.get<{ Querystring: { q?: string } }>('/search', async (request) => searchCities(request.query.q || ''));
};

export default geocodingRoutes;
