// note: config must be loaded before any other modules!
const config = require('./config'); // eslint-disable-line no-unused-vars
const app = require('./app');

function start() {
  if (process.env.START_SERVER === 'false') return null;
  if (process.env.BASE_URL === 'REPLACEME.ngrok.io' || !process.env.BASE_URL) {
    console.error(`
You must set the BASE_URL manually after running ngrok!\n

1. In a new tab run:
ngrok http 9085\n
2. Copy the base of the url like "d3c1-50-226-156-178.ngrok.io" and then open a new tab and run:
thread dev -s telephone-api
export BASE_URL="d3c1-50-226-156-178.ngrok.io"
yarn start\n

You should now be all set!
`);
    process.exit(1)
  }
  app.start();
}

start();
