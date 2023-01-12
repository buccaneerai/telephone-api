const randomstring = require('randomstring');
const get = require('lodash/get');
const {concat,merge} = require('rxjs');
const {
  delay,
  delayWhen,
  filter,
  map,
  scan,
  share,
  shareReplay,
  withLatestFrom
} = require('rxjs/operators');
const {conduit} = require('@buccaneerai/rxjs-socketio');
const logger = require('@buccaneerai/logging-utils');

const authorizeCallOrThrow = require('../lib/authorizeCallOrThrow');

// given a stream of websocket messages from Twilio, it processes them.
// https://www.twilio.com/docs/voice/twiml/stream#websocket-messages-from-twilio
const isEvent = eventKey => message => get(message, 'event') === eventKey;
// const isStartMessage = () => isEvent('start');
// const isConnectedMessage = () => isEvent('connected');
const isAudioMessage = () => isEvent('media');
const isStopMessage = () => isEvent('stop');

const getStreamConfig = ({
  encounterId,
  telephoneCallId,
  audioEncoding = 'audio/x-mulaw',
  sampleRate = 8000,
  saveRawAudio = true,
  saveRawSTT = true,
  saveWords = true,
  saveWindows = true,
  _randomstring = randomstring,
}) => ({
  inputType: 'telephoneCall',
  encounterId,
  telephoneCallId,
  streamId: _randomstring.generate(7),
  audioEncoding,
  sampleRate,
  saveRawAudio,
  saveRawSTT,
  saveWords,
  saveWindows,
});

const generateSocketioStream = ({
  delayTime = 3000,
  url = process.env.NOTESTREAM_API_URL,
  token = process.env.JWT_TOKEN,
  _conduit = conduit
} = {}) => ({
  audioChunk$,
  stop$,
  config$,
}) => {
  const configSub$ = config$.pipe(shareReplay(1));
  const firstMessage$ = configSub$.pipe(
    map(config => {
      return ({topic: 'new-stream', ...config});
    }),
    delay(delayTime)
  );
  const audioMessage$ = audioChunk$.pipe(
    scan((acc, next) => [next, acc[1] + 1], [null, -1]),
    withLatestFrom(configSub$),
    map(([[chunk, i], config]) => {
      return {
        streamId: config.streamId,
        topic: 'next-chunk',
        index: i,
        binary: chunk
      };
    })
  );
  const stopMessage$ = stop$.pipe(
    withLatestFrom(configSub$),
    map(([,config]) => ({streamId: config.streamId, topic: 'stop'}))
  );
  const completeMessage$ = configSub$.pipe(
    map(config => ({streamId: config.streamId, topic: 'complete'}))
  );
  const socketioMessage$ = concat(
    firstMessage$,
    merge(audioMessage$, stopMessage$),
    completeMessage$
  ).pipe(
    _conduit({
      url,
      stop$,
      // topics: ['stt-output', 'nlp', 'predictedElement', 'stream-complete'],
      socketOptions: {
        transports: ['websocket'],
        auth: { token },
      },
    }),
  );
  return socketioMessage$;
};

const consumeOneClientStream = ({
  request,
  // socket,
  shouldOutputMessages = false,
  _authorizeCallOrThrow = authorizeCallOrThrow,
  _generateSocketioStream = generateSocketioStream(),
  _getStreamConfig = getStreamConfig,
}) => event$ => {
  const url = get(request, 'url');
  const urlParts = url.split('/');
  const telephoneCallId = urlParts[urlParts.length - 2];
  const telephoneCallToken = urlParts[urlParts.length - 1];
  let baseUrl = '';
  for(let i = 0; i < urlParts.length - 2; i++) {
    baseUrl += urlParts[i];
  }
  logger.info(`Established twilio socket connection. \
[baseUrl=${baseUrl} telephoneCallId=${telephoneCallId} \
telephoneCallToken=${telephoneCallToken.substr(0,5)}...]`)

  const eventSub$ = event$.pipe(share());
  const message$ = eventSub$.pipe(
    map(({data}) => {
      if (data.toString) {
        return JSON.parse(data.toString());
      }
      return data;
    })
  );
  const messageSub$ = message$.pipe(share());
  // const connected$ = messageSub$.pipe(filter(isConnectedMessage()));
  // const start$ = messageSub$.pipe(filter(isStartMessage()));
  const stop$ = messageSub$.pipe(
    filter(isStopMessage()),
    share()
  );
  const telephoneCall$ = _authorizeCallOrThrow({
    telephoneCallId,
    telephoneCallToken
  }).pipe(shareReplay(1));
  const audioChunk$ = messageSub$.pipe(
    filter(isAudioMessage()),
    map(message => get(message, 'media.payload')),
    filter(payload => !!payload),
    map(payload => Buffer.from(payload, 'base64')),
    delayWhen(() => telephoneCall$), // buffer until auth is complete
    share()
  );
  const config$ = telephoneCall$.pipe(
    map(call => _getStreamConfig({
      telephoneCallId,
      encounterId: get(call, 'encounterId'),
    })),
    shareReplay(1)
  );
  const socketioMessage$ = _generateSocketioStream({
    audioChunk$,
    config$,
    stop$,
  });
  // in production, our stream does not need to output anything.
  // It simply passes the stream on to the socket.io API
  const output$ = socketioMessage$.pipe(
    filter(() => shouldOutputMessages)
    // map((data) => {
    //   console.log(data);
    // })
  );
  return output$;
};


module.exports = consumeOneClientStream;
module.exports.testExports = {
  generateSocketioStream
};
