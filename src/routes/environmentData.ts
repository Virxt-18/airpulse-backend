import { FastifyPluginAsync } from 'fastify';
import { getNasaFirms, getAqicn, getOpenMeteo } from '../services/environmentDataService';
import { getFirePoints } from '../services/fireService';

type PointQuery = { latitude?: number; longitude?: number };
type BboxQuery = { bbox?: string; days?: number };

function providerError(reply: any, error: unknown) {
  const message = error instanceof Error ? error.message : 'Provider request failed';
  const statusCode = message.includes('not configured') ? 503 : 502;
  return reply.code(statusCode).send({ error: message });
}

/** Direct satellite, reference-station and meteorological data access. */
const environmentDataRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: PointQuery }>('/aqicn', async (request, reply) => {
    try { return await getAqicn(request.query.latitude, request.query.longitude); }
    catch (error) { return providerError(reply, error); }
  });

  app.get<{ Querystring: PointQuery }>('/open-meteo', async (request, reply) => {
    try { return await getOpenMeteo(request.query.latitude, request.query.longitude); }
    catch (error) { return providerError(reply, error); }
  });

  app.get<{ Querystring: BboxQuery }>('/nasa-firms', async (request, reply) => {
    try { return await getNasaFirms(request.query.bbox, request.query.days); }
    catch (error) { return providerError(reply, error); }
  });

  // Parsed fire detections - what the map and hotspot detector consume.
  app.get<{ Querystring: BboxQuery }>('/fires', async (request) => ({
    fires: await getFirePoints(request.query.bbox, request.query.days)
  }));
};

export default environmentDataRoutes;