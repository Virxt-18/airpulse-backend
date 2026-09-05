import { FastifyPluginAsync } from 'fastify';
import {
  getNasaFirms,
  getOpenAq,
  getOpenMeteo
} from '../services/environmentDataService';

type PointQuery = { latitude?: number; longitude?: number };

function providerError(reply: any, error: unknown) {
  const message = error instanceof Error ? error.message : 'Provider request failed';
  const statusCode = message.includes('not configured') ? 503 : 502;
  return reply.code(statusCode).send({ error: message });
}

const environmentDataRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: PointQuery }>('/open-aq', async (request, reply) => {
    try { return await getOpenAq(request.query.latitude, request.query.longitude); }
    catch (error) { return providerError(reply, error); }
  });

  app.get<{ Querystring: PointQuery }>('/open-meteo', async (request, reply) => {
    try { return await getOpenMeteo(request.query.latitude, request.query.longitude); }
    catch (error) { return providerError(reply, error); }
  });

  app.get<{ Querystring: { bbox?: string; days?: number } }>('/nasa-firms', async (request, reply) => {
    try { return await getNasaFirms(request.query.bbox, request.query.days); }
    catch (error) { return providerError(reply, error); }
  });

};

export default environmentDataRoutes;