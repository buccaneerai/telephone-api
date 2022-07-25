const {concat, of} = require('rxjs');
const {delay,map,mergeMap,scan} = require('rxjs/operators');

const {fromFile, shortenChunks} = require('@buccaneerai/rxjs-fs');
const {conduit} = require('@buccaneerai/rxjs-ws');

// https://www.twilio.com/docs/voice/twiml/stream#websocket-messages-from-twilio

const streamSid = 'MZ18ad3ab5a668481ce02b83e7395059f0';

const connectedMessage = {
  event: 'connected',
  protocol: 'Call',
  version: '1.0.0',
};

const startMessage = {
  event: 'start',
  sequenceNumber: 2,
  start: {
    streamSid: 'MZ18ad3ab5a668481ce02b83e7395059f0',
    accountSid: 'AC123',
    callSid: 'CA123',
    tracks: ['inbound', 'outbound'],
    customParameters: {FirstName: 'Jane', LastName: 'Doe', RemoteParty: 'Bob'},
    mediaFormat: {
      encoding: 'audio/x-mulaw',
      sampleRate: 8000,
      channels: 1
    }
  },
  streamSid,
};

const stopMessage = {
  event: 'stop',
  sequenceNumber: '5',
  stop: {
      accountSid: 'AC123',
      callSid: 'CA123',
  },
  streamSid,
};

const mapAudioChunkToMediaMessage = () => ([audioChunk, index]) => ({
  event: 'media',
  sequenceNumber: `${index + 3}`,
  media: {
    track: 'outbound',
    chunk: `${index + 1}`,
    timestamp: '5',
    // MULAW payload must be encoded as base64 string with
    // sampleRate=8000, bitDepth=8, channels=1
    payload: audioChunk.toString('base64'),
  },
  streamSid,
});

const simulateInputStream = ({
  filePathIn,
  url,
  // 1 second of data = 8000 samples per second * 8 bits per sample (1 byte)
  chunkSize = 8000,
  millisecondsPerChunk = 1000,
  initialDelay = 3000,
  _conduit = conduit,
} = {}) => {
  const mulawAudioChunk$ = fromFile({filePath: filePathIn}).pipe(
    shortenChunks(chunkSize)
  );
  const mediaMessage$ = mulawAudioChunk$.pipe(
    // track the index
    scan((acc, next) => [next, acc[1] + 1], [null, -1]),
    // add time delay to spread chunks over real time
    mergeMap(data => of(data).delay(data[1] * millisecondsPerChunk)),
    // map each chunk to a websocket message
    map(mapAudioChunkToMediaMessage())
  );
  const messageUp$ = concat(
    of(connectedMessage).pipe(delay(initialDelay)),
    of(startMessage),
    mediaMessage$,
    of(stopMessage)
  );
  const messageOut$ = messageUp$.pipe(
    _conduit({url}) // stream messages to WebSocket server
  );
  messageOut$.subscribe(console.log, console.error, () => console.log('DONE'));
  return messageOut$;
};

module.exports = simulateInputStream;

