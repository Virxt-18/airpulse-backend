import { buildApp } from "./app";
import { env } from "./config/env";

const app = buildApp();

app
  .listen({ host: "0.0.0.0", port: env.PORT || 3000 })
  .then(() => {
    app.log.info(`AirPulse API listening on ${env.HOST}:${env.PORT}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
