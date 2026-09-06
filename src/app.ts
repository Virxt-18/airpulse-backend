import "dotenv/config";

import Fastify, { FastifyInstance, FastifyServerOptions } from "fastify";

import cors from "@fastify/cors";

import { airQualityRoutes } from "./routes/airQuality";
import { weatherRoutes } from "./routes/weather";

export interface AppOptions extends FastifyServerOptions {}

const options: AppOptions = {
  routerOptions: {
    ignoreTrailingSlash: true,
  },

  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        singleLine: false,
        ignore: "pid,hostname,reqId,responseTime,level",
      },
    },
  },
};

const app: FastifyInstance = Fastify(options);

// CORS
app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// Routes
app.register(airQualityRoutes);
app.register(weatherRoutes);

// Error handler
app.setErrorHandler((error, request, reply) => {
  const err = error as any;

  const code = Number(err.statusCode) || 500;

  if (code >= 400 && code < 500) {
    request.log.info(err);
  } else {
    request.log.error(err);
  }

  return reply.code(code).send({
    error: true,
    message: err.message || "Internal Server Error",
    details: err.error || {},
  });
});

// Test route
app.get("/test", async () => {
  return {
    message: "Test route works",
  };
});

export default app;

export { app, options };
