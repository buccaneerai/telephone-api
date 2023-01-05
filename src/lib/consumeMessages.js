// const get = require('lodash/get');
const {Observable} = require('rxjs');
const {mergeMap} = require('rxjs/operators');

const consumeOneClientStream = require('../operators/consumeOneClientStream');

const consumeMessages = (
  wsServer,
  _consumeOneClientStream = consumeOneClientStream
) => {
  const socketStream$$ = new Observable(obs => {
    wsServer.on('connection', (socket, request) => {
      const individualSocket$ = new Observable(_obs => {
        socket.on('message', (data) => {
          console.log('socket.message', data);
          _obs.next({data, context: {socket, request}});
        });
        socket.on('error', (err) => {
          console.log('socket.error');
          return _obs.error(err);
        });
        socket.on('close', () => {
          console.log('socket.close');
          return _obs.complete();
        });
      }).pipe(_consumeOneClientStream({socket, request}));
      obs.next(individualSocket$);
    });
  });
  const allSocket$ = socketStream$$.pipe(
    mergeMap(socket$ => socket$)
  );
  return allSocket$;
};

module.exports = consumeMessages;
