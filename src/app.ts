import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import corsPlugin from './plugins/cors';
import firebasePlugin from './plugins/firebase';
import { env } from './config/env';
import healthRoutes from './routes/health';
import dataHealthRoutes from './routes/dataHealth';
import overviewRoutes from './routes/overview';
import airQualityRoutes from './routes/airQuality';
import hotspotRoutes from './routes/hotspots';
import predictionRoutes from './routes/predictions';
import corridorRoutes from './routes/corridors';
import reportRoutes from './routes/reports';
import alertRoutes from './routes/alerts';
import analyticsRoutes from './routes/analytics';
import environmentDataRoutes from './routes/environmentData';
import federationRoutes from './routes/federation';
import geocodingRoutes from './routes/geocoding';
import { evaluateAlerts } from './services/alertService';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
    bodyLimit: 10 * 1024 * 1024 // citizen photo uploads
  });
  app.register(corsPlugin);
  app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
  app.register(firebasePlugin);

  app.get('/', async () => ({
    service: 'airpulse-backend',
    status: 'ok',
    problem: 'Hyper-local air quality intelligence for Indian economic corridors',
    capabilities: [
      'multi-source hotspot detection (station + satellite + citizen)',
      'AQ spike forecasting per city and corridor',
      'authority-routed alerting',
      'federated model sharing without raw data exchange'
    ],
    providers: {
      referenceStations: env.AQICN_TOKEN ? 'configured' : 'missing AQICN_TOKEN',
      satelliteFires: env.NASA_FIRMS_MAP_KEY ? 'configured' : 'missing NASA_FIRMS_MAP_KEY',
      modelService: env.PYTHON_AI_URL,
      persistence: env.FIREBASE_PROJECT_ID ? 'firestore' : 'in-memory'
    },
    routes: {
      airQuality: '/api/air-quality',
      hotspots: '/api/hotspots',
      detectHotspots: 'POST /api/hotspots/detect',
      predictions: '/api/predictions',
      corridors: '/api/corridors',
      reports: '/api/reports',
      alerts: '/api/alerts',
      evaluateAlerts: 'POST /api/alerts/evaluate',
      incidents: '/api/alerts/incidents',
      analytics: '/api/analytics',
      federation: '/api/federation',
      sharedModels: '/api/federation/models',
      environment: '/api/environment'
    },
    health: '/health',
    dataHealth: '/api/data-health'
  }));

  app.register(healthRoutes, { prefix: '/health' });
  app.register(dataHealthRoutes, { prefix: '/api/data-health' });
  app.register(overviewRoutes, { prefix: '/api/overview' });
  app.register(airQualityRoutes, { prefix: '/api/air-quality' });
  app.register(hotspotRoutes, { prefix: '/api/hotspots' });
  app.register(predictionRoutes, { prefix: '/api/predictions' });
  app.register(corridorRoutes, { prefix: '/api/corridors' });
  app.register(reportRoutes, { prefix: '/api/reports' });
  app.register(alertRoutes, { prefix: '/api/alerts' });
  app.register(analyticsRoutes, { prefix: '/api/analytics' });
  app.register(environmentDataRoutes, { prefix: '/api/environment' });
  app.register(federationRoutes, { prefix: '/api/federation' });
  app.register(geocodingRoutes, { prefix: '/api/geocoding' });

  // Baseline sweep on boot so the dashboard has live-derived data immediately.
  app.addHook('onReady', async () => {
    evaluateAlerts().catch((error) => app.log.warn({ error }, 'initial alert evaluation failed'));
  });

  return app;
}