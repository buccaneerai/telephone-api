const express = require('express');

const createCall = require('./createCall');

const router = express.Router();

router.get('/calls', (req, res, next) => res.sendStatus(200));
router.post('/calls', createCall());

module.exports = () => router;
