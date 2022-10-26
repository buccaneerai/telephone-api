const WebSocket = require('ws');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const cors = require('cors');
const expressJwt = require('express-jwt');
const logger = require('@buccaneerai/logging-utils');
const consumeMessages = require('./lib/consumeMessages');

const api = require('./lib/api');

const defaultPort = process.env.PORT || 9080;
const defaultHttpPort = process.env.HTTP_PORT || 3010;

const app = express();

// const errorMiddleware = (err, req, res, next) => {
//   logger.error(`Error: ${err.message}\n  `, err.stack);
//   res.status(err.status || 500);
//   res.setHeader('Content-Type', 'application/json; charset=utf-8');
//   res.end(
//     JSON.stringify({
//       error: err.message,
//       stack: err.stack && process.env.NODE_ENV !== 'production' ? err.stack.split('\n') : undefined,
//     })
//   );
// };

const configureApp = () => {
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(bodyParser.json());

  // Ping and healthcheck routes
  app.get('/', (req, res, next) => res.sendStatus(200));
  app.get('/pingz', (req, res, next) => res.sendStatus(200));
  app.get('/health', (req, res, next) => res.sendStatus(200));

  // API routes
  app.use(
    '/api/v1',
    logger.requestLogger(),
    expressJwt({ secret: process.env.JWT_SECRET, credentialsRequired: false }),
    api()
  );
};


const start = (port = defaultPort, httpPort = defaultHttpPort) => {
  // FIXME: must support WSS (TLS)
  const wsServer = new WebSocket.Server({
    port
  });
  const consumer$ = consumeMessages(wsServer);
  consumer$.subscribe(
    null,
    err => logger.error(err.message, {trace: err.trace}),
  );
  configureApp();
  app.listen(
    httpPort,
    () => logger.info(`Listening on ${httpPort}`, { event: 'express-startup' })
  );
  return {app, wsServer};
};

module.exports = {
  ...app,
  start,
};
