const twilio = require('twilio');

// const VoiceResponse = twilio.twiml.VoiceResponse;

const makeCall = ({
  phoneNumberTo,
  accountSid = process.env.TWILIO_ACCOUNT_ID,
  apiKey = process.env.TWILIO_API_KEY,
  apiSecret = process.env.TWILIO_API_SECRET,
  phoneNumberFrom = process.env.TWILIO_PHONE_NUM,
  // twiml = '<Response><Say>Ahoy, World!</Say></Response>',
  record = false,
}) => {
  // console.log(accountSid, apiKey, phoneNumberFrom, phoneNumberTo);
  const client = twilio(apiKey, apiSecret, { accountSid });
  client.calls
    .create({
      record,
      // twiml: twiml,
      url: 'https://demo.twilio.com/welcome/voice/',
      to: phoneNumberTo,
      from: phoneNumberFrom,
    })
    .then(console.log)
    .catch(console.error);
};

module.exports = makeCall;
