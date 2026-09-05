import { FastifyPluginAsync } from 'fastify';
import { listAlerts, subscribeAlert } from '../controllers/alertController';

type AlertBody = { location: string; threshold: number };

const alertRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => listAlerts());
  app.post<{ Body: AlertBody }>('/', async (request, reply) => {
    const { location, threshold } = request.body;
    if (!location || !Number.isFinite(threshold)) return reply.code(400).send({ error: 'location and threshold are required' });
    return reply.code(201).send(subscribeAlert(location, threshold));
  });
};

export default alertRoutes;
