import { FastifyPluginAsync } from 'fastify';
import { listAlerts, subscribeAlert, updateAlert, evaluateAlerts, listIncidents } from '../services/alertService';

type AlertBody = { location: string; threshold: number };

const alertRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => listAlerts());

  app.get('/incidents', async () => listIncidents());

  app.post<{ Querystring: { refresh?: string } }>('/evaluate', async (request) =>
    evaluateAlerts({ refresh: request.query.refresh === 'true' })
  );

  app.post<{ Body: AlertBody }>('/', async (request, reply) => {
    const { location, threshold } = request.body || ({} as AlertBody);
    if (!location || !Number.isFinite(threshold) || threshold < 50 || threshold > 500) {
      return reply.code(400).send({ error: 'location and a threshold between 50 and 500 are required' });
    }
    return reply.code(201).send(await subscribeAlert(location, threshold));
  });

  app.patch<{ Params: { id: string }; Body: { action: 'resolve' | 'enable' | 'disable' } }>('/:id', async (request, reply) => {
    const updated = await updateAlert(request.params.id, request.body?.action);
    if (!updated) return reply.code(404).send({ error: 'alert not found' });
    return updated;
  });
};

export default alertRoutes;