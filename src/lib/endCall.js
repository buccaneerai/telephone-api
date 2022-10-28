const logger = require('@buccaneerai/logging-utils');

// Example callback response for twilio
const endCall = () => (req, res) => {
  logger.info(`Ending twilio call... [callId=${req.params.telephoneCallId}]`);
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">The call is ending due to inactivity.</Say>
</Response>`);
};

module.exports = endCall;
