const get = require('lodash/get');
const twilio = require('twilio');

const logger = require('@buccaneerai/logging-utils');

const consentXML = '<Say voice="woman">Thread Medical is recording this call for your doctor\'s notetaking purposes.</Say>';
const callWorkflowXML = ({
  askConsent = true,
  wssUrl,
  pauseLength,
} = {}) => (`
  <Response>
    <Start>
        <Stream name="telephone-api-stream" url="${wssUrl}" />
    </Start>
    ${askConsent ? consentXML : ''}
    <Pause length="${pauseLength}" />
  </Response>
`);

// Example Gather Callback
// <Response>
//   <Gather input="speech" speechModel="experimental_conversations" speechTimeout="10" action="${timeoutUrl}" method="POST">
//     ${askConsent ? consentXML : ''}
//   </Gather>
// </Response>

const makeCall = ({client}) => ({to, from, record, twiml, sendDigits}) => {
  return client.calls.create({to, from, twiml, record, sendDigits});
};

const createCall = ({
  baseUrl = process.env.BASE_URL,
  apiSecret = process.env.TWILIO_API_SECRET,
  accountSid = process.env.TWILIO_ACCOUNT_ID,
  phoneNumberFrom = process.env.TWILIO_PHONE_NUM,
  pauseLength = process.env.TWILIO_PAUSE_LENGTH || '1800',
  _record = process.env.TWILIO_RECORD,
  _twilio = twilio,
  _makeCall = makeCall
} = {}) => (req, res) => {
  let record = _record || false;
  if (record === 'false') {
    record = false;
  } else if (record === 'true') {
    record = true;
  }
  let to = get(req, 'body.phoneNumberTo', '');
  // to = to.replace('-', '').replace(' ', '').replace('(', '').replace(')', '');
  let pin = get(req, 'body.telephonePin', '');
  pin = pin.replace(/ /g, '').replace(/-/g, '');
  let sendDigits;
  if (pin) {
    sendDigits = `www${pin}`;
  }
  const telephoneCallId = get(req, 'body.telephoneCallId');
  const token = get(req, 'body.telephoneCallToken');
  const client = _twilio(accountSid, apiSecret);
  const wssUrl = `wss://${baseUrl}/${telephoneCallId}/${token}`;
  const timeoutUrl = `https://${baseUrl}/api/v1/end/${telephoneCallId}/${token}`;
  const twiml = callWorkflowXML({wssUrl, timeoutUrl, pauseLength});
  logger.info(`Attempting to start twilio call... [telephoneCallId=${telephoneCallId} to=${to} pin=${pin} baseUrl=${baseUrl}]`);
  const promise = _makeCall({client})({to, from: phoneNumberFrom, twiml, record, sendDigits})
    .then((call) => {
      logger.info(`Established twilio call! [sid=${call.sid}]`);
      res.json({
        telephoneCallId,
        twilioCallId: call.sid,
      });
    })
    .catch(err => {
      logger.error(`Unable to establish twilio call! [telephoneCallId=${telephoneCallId} to=${to} pin=${pin} baseUrl=${baseUrl}]`);
      logger.error(err.message, {error: JSON.stringify(err)});
      res.status(500).send({error: JSON.stringify(err)});
    });
  return promise;
};

module.exports = createCall;
