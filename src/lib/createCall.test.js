const {expect} = require('chai');
const sinon = require('sinon');
// const {marbles} = require('rxjs-marbles/mocha');

const createCall = require('./createCall');

describe('createCall', () => {
  it('should export a function', () => {
    expect(createCall).to.be.a('function');
  });

  it('should call Twilio call with correct parameters', done => {
    const req = {
      body: {
        phoneNumberTo: '+7345439876',
        telephoneCallId: 'mycallid',
        telephoneCallToken: 'mytoken',
      },
    };
    const res = {
      json: sinon.stub(),
      status: sinon.stub(),
    };
    const fakeCall = {sid: 'mytwiliocall'};
    const fakeCallStream = {sid: 'mytwiliostream', call_sid: fakeCall.sid};
    const fakeClient = {foo: 'bar'};
    const startCall = sinon.stub().returns(Promise.resolve(fakeCall));
    const params = {
      baseUrl: 'http://localhost:9086',
      phoneNumberFrom: '+1234567890',
      _twilio: sinon.stub().returns(fakeClient),
      _makeCall: sinon.stub().returns(startCall),
    };
    const makeCall = createCall(params)(req, res).then(result => {
      expect(params._twilio.calledOnce).to.be.true;
      expect(params._makeCall.calledOnce).to.be.true;
      expect(startCall.calledOnce).to.be.true;
      expect(startCall.firstCall.args[0]).to.deep.include({
        to: req.body.phoneNumberTo,
        from: params.phoneNumberFrom,
      });
      expect(res.status.called).to.be.false;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal({
        telephoneCallId: req.body.telephoneCallId,
        twilioCallId: fakeCall.sid
      });
      done();
    });
  });
});
