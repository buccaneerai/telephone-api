const fs = require('fs');
const twilio = require('twilio');

const fetchRecording = client => recordingId => {
  return client.recordings(recordingId).fetch();
};

const fetchRecording = ({
  callSid,
  filePathOut,
  accountSid,
  apiKey,
  apiSecret,
}) => {
  const client = twilio(apiKey, apiSecret, { accountSid });
  client
    .calls(callSid)
    .fetch()
    .then(console.log)
    .catch(console.error)
  // const buffer =
  // const out = fs.writeFileSync(filePathOut, buffer);
  // return out;
};

module.exports = fetchRecording;
