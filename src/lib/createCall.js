const get = require('lodash/get');
const twilio = require('twilio');

const {error} = require('@buccaneerai/logging-utils');

const logError = error;
const consentXML = '<Say voice="woman">Thread Medical is recording this call for your doctor\'s notetaking purposes.</Say>';
const callWorkflowXML = ({
  askConsent = true,
} = {}) => (`
  <?xml version="1.0" encoding="UTF-8"?>
  <Response>
    ${askConsent ? consentXML : ''}
  </Response>
`);

// https://www.twilio.com/docs/voice/api/media-streams
const startStreamForCall = ({client, url}) => ({sid}) => {
  const promise = client.calls(sid).streams.create({url});
  return promise;
};

const makeCall = ({client}) => ({to, from, twiml}) => (
  client.calls.create({to, from, twiml})
);

const createCall = ({
  baseUrl = process.env.BASE_URL,
  apiKey = process.env.TWILIO_API_KEY,
  apiSecret = process.env.TWILIO_API_SECRET,
  accountSid = process.env.TWILIO_ACCOUNT_ID,
  phoneNumberFrom = process.env.TWILIO_PHONE_NUM,
} = {}) => (req, res) => {
  const to = get(req, 'body.phoneNumberTo');
  const telephoneCallId = get(req, 'body.telephoneCallId');
  const token = get(req, 'body.telephoneCallToken');
  const client = twilio(apiKey, apiSecret, {accountSid});
  const twiml = callWorkflowXML();
  const url = `${baseUrl}?telephoneStreamId=${telephoneCallId}&telephoneCallToken=${token}`;
  makeCall({client})({to, from: phoneNumberFrom, twiml})
    .then(startStreamForCall({client, url}))
    .then(mediaStream => res.json({
      twilioCallId: mediaStream.call_sid,
      twilioMediaStreamId: mediaStream.sid,
    }))
    .catch(err => {
      logError(err.message, {error: JSON.stringify(err)});
      res.status(500);
    });
};

module.exports = createCall;
