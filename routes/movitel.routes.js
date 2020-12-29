const express = require('express');
const sms = require('../controllers/movitel.controller.js');
const router = express.Router();

router.get('/', sms.sendText);
//router.get('/feedback', sms.sendFeedback);
//router.get('/invoice', sms.sendInvoice);
//router.get('/bulk', sms.sendBulk);
//router.get('/bulk', sms.sendAlert);
//router.post('/setid', sms.setID);
//router.post('/status', sms.updateStatus);

module.exports = router