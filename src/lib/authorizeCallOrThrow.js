const get = require('lodash/get');
const {of,throwError} = require('rxjs');
const {map, mergeMap} = require('rxjs/operators');

const gql = require('@buccaneerai/graphql-sdk');

const errors = {
  unauthorized: () => new Error('unauthorized'),
};

const instantiateClient = ({
  url = process.env.GRAPHQL_URL,
  token = process.env.JWT_TOKEN,
  _gql = gql
} = {}) => _gql({url, token});

const mapResponseToCall = () => response => get(response, 'telephoneCalls[0]', null);

const authorizeCallOrThrow = ({
  telephoneCallId,
  telephoneCallToken,
  _findTelephoneCalls = instantiateClient().findCallStreams
}) => {
  const response$ = _findTelephoneCalls({filter: {_id: telephoneCallId}});
  const authorizeOrThrow$ = response$.pipe(
    map(mapResponseToCall()),
    mergeMap(call =>
      call
      && call._id === telephoneCallId
      && call.token === telephoneCallToken
      ? of(call)
      : throwError(errors.unauthorized())
    )
  );
  return authorizeOrThrow$;
};

module.exports = authorizeCallOrThrow;
