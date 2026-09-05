import { buildApp } from './src/app';
import { env } from './src/config/env';

const app = buildApp();

app.listen({ host: env.HOST, port: env.PORT }).then(() => {
	app.log.info(`AirPulse API listening on ${env.HOST}:${env.PORT}`);
}).catch((error) => {
	app.log.error(error);
	process.exit(1);
});

