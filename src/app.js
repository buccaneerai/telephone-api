const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const cors = require('cors');
const expressJwt = require('express-jwt');
const logger = require('@buccaneerai/logging-utils');

const api = require('./api');

const defaultPort = process.env.PORT || 9080;

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(bodyParser.json());

// Error Handling at the root level
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
  app.get('/', (req, res, next) => res.sendStatus(204));
  app.get('/pingz', (req, res, next) => res.sendStatus(204));
  app.get('/health', (req, res, next) => res.sendStatus(204));

  // API routes
  app.use(
    '/api/v1',
    logger.requestLogger(),
    expressJwt({ secret: process.env.JWT_SECRET, credentialsRequired: false }),
    api()
  );
};


const start = (port = defaultPort) => {
  configureApp();
  app.listen(
    port,
    () => logger.info(`Listening on ${port}`, { event: 'express-startup' })
  );
};

module.exports = {
  ...app,
  start,
};
