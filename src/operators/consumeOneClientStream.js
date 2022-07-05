const qs = require('qs');
const randomstring = require('randomstring');
const get = require('lodash/get');
const {concat,of,merge} = require('rxjs');
const {
  delay,
  filter,
  map,
  mapTo,
  mergeMap,
  scan,
  share
} = require('rxjs/operators');
const {conduit} = require('@buccaneerai/rxjs-socketio');

const authorizeCallOrThrow = require('../lib/authorizeCallOrThrow');

// given a stream of websocket messages from Twilio, it processes them.
// https://www.twilio.com/docs/voice/twiml/stream#websocket-messages-from-twilio
const isEvent = eventKey => message => get(message, 'event') === eventKey;
// const isStartMessage = () => isEvent('start');
// const isConnectedMessage = () => isEvent('connected');
const isAudioMessage = () => isEvent('media');
const isStopMessage = () => isEvent('stop');

const getQueryStringFromUrl = url => url.replace(/^.*\?/, '');

const generateSocketioStream = ({
  audioChunk$,
  stop$,
  config,
  url = process.env.NOTESTREAM_API_URL,
  token = process.env.JWT_TOKEN,
  _conduit = conduit,
}) => {
  const {streamId} = config;
  const firstMessage$ = of({topic: 'new-stream', ...config}).pipe(delay(3000));
  const audioMessage$ = audioChunk$.pipe(
    scan((acc, next) => [next, acc[1] + 1], [null, -1]),
    map(([chunk, i]) => ({
      streamId,
      topic: 'next-chunk',
      index: i,
      binary: chunk
    }))
  );
  const stopMessage$ = stop$.pipe(mapTo({streamId, topic: 'stop'}));
  const socketioMessage$ = concat(
    firstMessage$,
    merge(audioMessage$, stopMessage$),
    of({streamId, topic: 'complete'})
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
  audioEncoding = 'audio/x-mulaw',
  sampleRate = 8000,
  saveRawAudio = true,
  saveRawSTT = true,
  saveWords = true,
  saveWindows = true,
  _authorizeCallOrThrow = authorizeCallOrThrow,
  _generateSocketioStream = generateSocketioStream,
  _randomstring = randomstring,
}) => event$ => {
  const url = get(request, 'url');
  const queryString = getQueryStringFromUrl(url);
  const query = qs.parse(queryString);
  const telephoneCallId = get(query, 'telephoneCallId');
  const telephoneCallToken = get(query, 'telephoneCallToken');
  const streamId = _randomstring.generate(7);
  const streamConfig = {
    inputType: 'telephoneCall',
    telephoneCallId,
    telephoneCallToken,
    streamId,
    audioEncoding,
    sampleRate,
    saveRawAudio,
    saveRawSTT,
    saveWords,
    saveWindows,
  };
  const eventSub$ = event$.pipe(share());
  const message$ = eventSub$.pipe(map(({data}) => data));
  const messageSub$ = message$.pipe(share());
  // const connected$ = messageSub$.pipe(filter(isConnectedMessage()));
  // const start$ = messageSub$.pipe(filter(isStartMessage()));
  const stop$ = messageSub$.pipe(
    filter(isStopMessage()),
    share()
  );
  const authorizeOrThrow$ = _authorizeCallOrThrow({
    telephoneCallId,
    telephoneCallToken
  });
  const audioChunk$ = authorizeOrThrow$.pipe(
    mergeMap(() => messageSub$.pipe(
      filter(isAudioMessage()),
      map(message => get(message, 'mediaStream.payload')),
      filter(payload => !!payload),
      map(payload => Buffer.from(payload, 'base64')),
      share()
    ))
  );
  const socketioMessage$ = _generateSocketioStream({
    stop$,
    audioChunk$,
    config: streamConfig,
  });
  // our stream does not need to output anything. It simply passes the stream
  // on to the socket.io API
  const output$ = socketioMessage$.pipe(
    filter(() => false)
  );
  return output$;
};

module.exports = consumeOneClientStream;
