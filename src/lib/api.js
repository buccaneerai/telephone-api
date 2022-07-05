const express = require('express');

const createCall = require('./createCall');

const router = express.Router();

router.post('/calls', createCall());

module.exports = () => router;
