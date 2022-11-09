const {expect} = require('chai');
const sinon = require('sinon');
const {marbles} = require('rxjs-marbles/mocha');

const consumeOneClientStream = require('./consumeOneClientStream');
const {testExports} = consumeOneClientStream;
const {
  generateSocketioStream
} = testExports;

const streamSid = 'MZ18ad3ab5a668481ce02b83e7395059f0';

const connectedMessage = Buffer.from(JSON.stringify({
  event: 'connected',
  protocol: 'Call',
  version: '1.0.0',
}));

const startMessage = Buffer.from(JSON.stringify({
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
}));

const stopMessage = Buffer.from(JSON.stringify({
  event: 'stop',
  sequenceNumber: '5',
  stop: {
      accountSid: 'AC123',
      callSid: 'CA123',
  },
  streamSid,
}));

const mapAudioChunkToMediaMessage = () => ([audioChunk, index]) => (Buffer.from(JSON.stringify({
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
})));

describe('consumeOneClientStream', () => {
  it('should export a function', () => {
    expect(consumeOneClientStream).to.be.a('function');
  });

  it('should form stream of socketio messages given valid input streams', marbles(m => {
    const streamId = 'mystreamid';
    const config = {
      streamId,
      inputType: 'telephoneCall',
      encounterId: 'myencounter',
      telephoneCallId: 'mycallid',
      audioEncoding: 'audio/x-mulaw',
      sampleRate: 8000,
      saveRawAudio: true,
      saveRawSTT: true,
      saveWords: true,
      saveWindows: true,
    };
    const chunks = [
      Buffer.from('foobar0'),
      Buffer.from('foobar1'),
      Buffer.from('foobar2'),
    ];
    const config$ = m.cold('--(0|)', [config]);
    const audioChunk$ = m.cold('0---1-(2|)', chunks);
    const stop$ = m.cold('|', []);
    const options = {
      delayTime: 0,
      _conduit: sinon.stub().returns(in$ => in$),
    };
    const params = {
      config$,
      audioChunk$,
      stop$,
    };
    const out$ = generateSocketioStream(options)(params);
    const expected$ = m.cold('--(01)2-(34|)', [
      {streamId, topic: 'new-stream', ...config},
      {streamId, topic: 'next-chunk', index: 0, binary: chunks[0]},
      {streamId, topic: 'next-chunk', index: 1, binary: chunks[1]},
      {streamId, topic: 'next-chunk', index: 2, binary: chunks[2]},
      {streamId, topic: 'complete'},
    ]);
    m.expect(out$).toBeObservable(expected$);
  }));

  it('should properly handle basic input stream', marbles(m => {
    const streamId = 'mystreamid';
    const configure = ({encounterId, telephoneCallId}) => ({
      streamId,
      encounterId,
      telephoneCallId,
      inputType: 'telephoneCall',
      audioEncoding: 'audio/x-mulaw',
      sampleRate: 8000,
      saveRawAudio: true,
      saveRawSTT: true,
      saveWords: true,
      saveWindows: true,
    });
    const telephoneCall = {
      _id: 'mycallid',
      encounterId: 'myencounter',
      token: 'mycalltoken',
    };
    const chunks = [
      Buffer.from('foobar0'),
      Buffer.from('foobar1'),
    ];
    const events = [
      {data: connectedMessage},
      {data: startMessage},
      ...chunks.map((c, i) => ({data: mapAudioChunkToMediaMessage()([c, i])})),
      {data: stopMessage},
    ];
    const telephoneCall$ = m.cold('--(0|)', [telephoneCall]);
    const event$ = m.cold('-0-1-2-3-(4|)', events);
    const params = {
      request: {
        url: 'http://localhost:3008/mycallid/mycalltoken'
      },
      shouldOutputMessages: true,
      _authorizeCallOrThrow: sinon.stub().returns(telephoneCall$),
      _generateSocketioStream: generateSocketioStream({
        delayTime: 0,
        _conduit: sinon.stub().returns(in$ => in$),
      }),
      _getStreamConfig: configure,
    };
    const result$ = event$.pipe(consumeOneClientStream(params));
    const expected$ = m.cold('--(0)--1-2-(34|)', [
      {streamId, topic: 'new-stream', ...configure({
        encounterId: telephoneCall.encounterId,
        telephoneCallId: telephoneCall._id,
      })},
      {streamId, topic: 'next-chunk', index: 0, binary: chunks[0]},
      {streamId, topic: 'next-chunk', index: 1, binary: chunks[1]},
      {streamId, topic: 'stop'},
      {streamId, topic: 'complete'},
    ]);
    debugger;
    m.expect(result$).toBeObservable(expected$);
  }));

  it('should throw if telephone call is not authenticated', marbles(m => {
    const streamId = 'mystreamid';
    const configure = ({encounterId, telephoneCallId}) => ({
      streamId,
      encounterId,
      telephoneCallId,
      inputType: 'telephoneCall',
      audioEncoding: 'audio/x-mulaw',
      sampleRate: 8000,
      saveRawAudio: true,
      saveRawSTT: true,
      saveWords: true,
      saveWindows: true,
    });
    const chunks = [Buffer.from('foobar0'), Buffer.from('foobar1')];
    const events = [
      {data: connectedMessage},
      {data: startMessage},
      ...chunks.map((c, i) => ({data: mapAudioChunkToMediaMessage()([c, i])})),
      {data: stopMessage},
    ];
    const telephoneCall$ = m.cold('--#', null, new Error('unauthorized'));
    const event$ = m.cold('-0-1-2-3-(4|)', events);
    const params = {
      request: {
        url: 'http://localhost:3008?telephoneCallId=mycallid&telephoneCallToken=mycalltoken'
      },
      shouldOutputMessages: true,
      _authorizeCallOrThrow: sinon.stub().returns(telephoneCall$),
      _generateSocketioStream: generateSocketioStream({
        delayTime: 0,
        _conduit: sinon.stub().returns(in$ => in$),
      }),
      _getStreamConfig: configure,
    };
    const result$ = event$.pipe(consumeOneClientStream(params));
    const expected$ = m.cold('--#', null, new Error('unauthorized'));
    m.expect(result$).toBeObservable(expected$);
  }));
});
