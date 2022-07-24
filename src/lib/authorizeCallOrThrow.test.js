const {expect} = require('chai');
const sinon = require('sinon');
const {marbles} = require('rxjs-marbles/mocha');

const authorizeCallOrThrow = require('./authorizeCallOrThrow');

describe('authorizeCallOrThrow', () => {
  it('should export a function', () => {
    expect(authorizeCallOrThrow).to.be.a('function');
  });

  it('should throw when telephone call token does not match', marbles(m => {
    const telephoneCallId = 'fakecallid';
    const telephoneCallToken = 'mysecrettoken';
    const expiration = '2042-07-05T11:58:03.375-04:00';
    const fakeResponse = {
      telephoneCalls: [{_id: 'fakecallid', token: 'notmytoken', isClaimed: false, expiration}],
    };
    const params = {
      telephoneCallId,
      telephoneCallToken,
      _findTelephoneCalls: sinon.stub().returns(m.cold('-(0|)', [fakeResponse])),
      _updateTelephoneCall: sinon.stub().returns(m.cold('-(0|)', ['foobar'])),
    };
    const result$ = authorizeCallOrThrow(params);
    const expected$ = m.cold('-#', null, new Error('unauthorized'));
    m.expect(result$).toBeObservable(expected$);
  }));

  it('should throw when telephone call _id does not match', marbles(m => {
    const _id = 'fakecallid';
    const token = 'mysecrettoken';
    const expiration = '2042-07-05T11:58:03.375-04:00';
    const fakeResponse = {
      telephoneCalls: [{_id: 'notmyid', token, isClaimed: false, expiration}],
    };
    const params = {
      telephoneCallId: _id,
      telephoneCallToken: token,
      _findTelephoneCalls: sinon.stub().returns(m.cold('-(0|)', [fakeResponse])),
      _updateTelephoneCall: sinon.stub().returns(m.cold('-(0|)', ['foobar'])),
    };
    const result$ = authorizeCallOrThrow(params);
    const expected$ = m.cold('-#', null, new Error('unauthorized'));
    m.expect(result$).toBeObservable(expected$);
  }));

  it('should throw when telephone call is not found', marbles(m => {
    const _id = 'fakecallid';
    const token = 'mysecrettoken';
    const fakeResponse = {
      telephoneCalls: [],
    };
    const params = {
      telephoneCallId: _id,
      telephoneCallToken: token,
      _findTelephoneCalls: sinon.stub().returns(m.cold('-(0|)', [fakeResponse])),
      _updateTelephoneCall: sinon.stub().returns(m.cold('-(0|)', ['foobar'])),
    };
    const result$ = authorizeCallOrThrow(params);
    const expected$ = m.cold('-#', null, new Error('unauthorized'));
    m.expect(result$).toBeObservable(expected$);
  }));

  it('should throw when telephone call token is already claimed', marbles(m => {
    const _id = 'fakecallid';
    const token = 'mysecrettoken';
    const expiration = '2042-07-05T11:58:03.375-04:00';
    const fakeResponse = {
      telephoneCalls: [{_id, token, isClaimed: true, expiration}],
    };
    const params = {
      telephoneCallId: _id,
      telephoneCallToken: token,
      _findTelephoneCalls: sinon.stub().returns(m.cold('-(0|)', [fakeResponse])),
      _updateTelephoneCall: sinon.stub().returns(m.cold('-(0|)', ['foobar'])),
    };
    const result$ = authorizeCallOrThrow(params);
    const expected$ = m.cold('-#', null, new Error('unauthorized'));
    m.expect(result$).toBeObservable(expected$);
  }));

  it('should throw when telephone call token is expired', marbles(m => {
    const _id = 'fakecallid';
    const token = 'mysecrettoken';
    const expiration = '2021-07-05T11:58:03.375-04:00';
    const fakeResponse = {
      telephoneCalls: [{_id, token, expiration, isClaimed: true}],
    };
    const params = {
      telephoneCallId: _id,
      telephoneCallToken: token,
      _findTelephoneCalls: sinon.stub().returns(m.cold('-(0|)', [fakeResponse])),
      _updateTelephoneCall: sinon.stub().returns(m.cold('-(0|)', ['foobar'])),
    };
    const result$ = authorizeCallOrThrow(params);
    const expected$ = m.cold('-#', null, new Error('unauthorized'));
    m.expect(result$).toBeObservable(expected$);
  }));

  it('should return call when the call token is valid', marbles(m => {
    const _id = 'fakecallid';
    const token = 'mysecrettoken';
    const expiration = '2042-07-05T11:58:03.375-04:00';
    const fakeResponse = {
      telephoneCalls: [{_id, token, expiration, isClaimed: false}],
    };
    const params = {
      telephoneCallId: _id,
      telephoneCallToken: token,
      _findTelephoneCalls: sinon.stub().returns(m.cold('-(0|)', [fakeResponse])),
      _updateTelephoneCall: sinon.stub().returns(m.cold('(0|)', ['foobar'])),
    };
    const result$ = authorizeCallOrThrow(params);
    const expected$ = m.cold('-(0|)', [fakeResponse.telephoneCalls[0]]);
    m.expect(result$).toBeObservable(expected$);
  }));
});
