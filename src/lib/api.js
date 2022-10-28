const express = require('express');

const createCall = require('./createCall');
// const endCall = require('./endCall');

const router = express.Router();

router.post('/calls', createCall());
// Example callback from twilio
// router.post('/end/:telephoneCallId/:telephoneCallToken', endCall());
module.exports = () => router;
