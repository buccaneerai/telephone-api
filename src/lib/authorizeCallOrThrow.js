const get = require('lodash/get');
const {DateTime} = require('luxon');
const {throwError} = require('rxjs');
const {map, mapTo, mergeMap} = require('rxjs/operators');

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

const callIsExpired = call => {
  const expiresISO = get(call, 'expiration');
  if (!expiresISO) return true;
  const expiration = DateTime.fromISO(expiresISO);
  const now = DateTime.now();
  const isExpired = now > expiration;
  return isExpired;
};

const authorizeCallOrThrow = ({
  telephoneCallId,
  telephoneCallToken,
  _findTelephoneCalls = instantiateClient().findTelephoneCalls,
  _updateTelephoneCall = instantiateClient().updateTelephoneCall
}) => {
  const response$ = _findTelephoneCalls({filter: {_id: telephoneCallId}});
  const authorizeOrThrow$ = response$.pipe(
    map(mapResponseToCall()),
    mergeMap(call =>
      call
      && call._id === telephoneCallId
      && call.token === telephoneCallToken
      && !call.isClaimed
      // check expiration of token
      && !callIsExpired(call)
      ? _updateTelephoneCall({ // claim the token so it cannot be re-used
        docId: telephoneCallId,
        set: {isClaimed: true}
      }).pipe(
        mapTo(call)
      )
      : throwError(errors.unauthorized())
    )
  );
  return authorizeOrThrow$;
};

module.exports = authorizeCallOrThrow;
