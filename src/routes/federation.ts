import { FastifyPluginAsync } from 'fastify';
import { getFederatedNetwork, registerNode, publishModel, listSharedModels, federationStats } from '../services/networkService';

type NodeBody = { city: string; accuracy?: number; samples?: number; status?: 'online' | 'syncing' | 'offline' };
type ModelBody = { city: string; accuracy: number; version?: string; samples?: number; meanResidual?: number; drift?: number };

/**
 * Federated model exchange. Cities pull the shared model catalogue and push their
 * own update statistics; raw data never crosses the boundary.
 */
const federationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => getFederatedNetwork());
  app.get('/stats', async () => federationStats());
  app.get('/models', async () => listSharedModels());

  app.post<{ Body: NodeBody }>('/nodes', async (request, reply) => {
    const { city, accuracy, samples, status } = request.body || ({} as NodeBody);
    if (!city || typeof accuracy !== 'number') {
      return reply.code(400).send({ error: 'city and numeric accuracy are required' });
    }
    return reply.code(201).send(registerNode(city, accuracy, samples, status));
  });

  app.post<{ Body: ModelBody }>('/models', async (request, reply) => {
    const { city, accuracy, version, samples, meanResidual, drift } = request.body || ({} as ModelBody);
    if (!city || typeof accuracy !== 'number') {
      return reply.code(400).send({ error: 'city and numeric accuracy are required' });
    }
    return reply.code(201).send(publishModel(city, accuracy, {
      samples: samples ?? 0,
      meanResidual: meanResidual ?? 0,
      drift: drift ?? 0
    }, version));
  });
};

export default federationRoutes;