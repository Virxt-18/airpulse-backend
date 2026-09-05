import Fastify, { FastifyInstance } from 'fastify';
import corsPlugin from './plugins/cors';
import firebasePlugin from './plugins/firebase';
import healthRoutes from './routes/health';
import overviewRoutes from './routes/overview';
import airQualityRoutes from './routes/airQuality';
import hotspotRoutes from './routes/hotspots';
import predictionRoutes from './routes/predictions';
import reportRoutes from './routes/reports';
import alertRoutes from './routes/alerts';
import analyticsRoutes from './routes/analytics';
import environmentDataRoutes from './routes/environmentData';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  app.register(corsPlugin);
  app.register(firebasePlugin);
  app.get('/', async () => ({
    service: 'airpulse-backend',
    status: 'ok',
    health: '/health'
  }));
  app.register(healthRoutes, { prefix: '/health' });
  app.register(overviewRoutes, { prefix: '/api/overview' });
  app.register(airQualityRoutes, { prefix: '/api/air-quality' });
  app.register(hotspotRoutes, { prefix: '/api/hotspots' });
  app.register(predictionRoutes, { prefix: '/api/predictions' });
  app.register(reportRoutes, { prefix: '/api/reports' });
  app.register(alertRoutes, { prefix: '/api/alerts' });
  app.register(analyticsRoutes, { prefix: '/api/analytics' });
  app.register(environmentDataRoutes, { prefix: '/api/environment' });
  return app;
}
