import { FastifyPluginAsync } from 'fastify';
import { listReports, submitReport } from '../controllers/reportController';

type ReportBody = { location: string; description: string };

const reportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => listReports());
  app.post<{ Body: ReportBody }>('/', async (request, reply) => {
    const { location, description } = request.body;
    if (!location || !description) return reply.code(400).send({ error: 'location and description are required' });
    return reply.code(201).send(submitReport(location, description));
  });
};

export default reportRoutes;
