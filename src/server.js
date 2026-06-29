import { createApp } from './app.js';
import { initDb, closeDb } from './db/index.js';
import config from './config/index.js';

initDb();
const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `▶ AI Video Publisher running at http://localhost:${config.port} (${config.env})`
  );
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;
