const express = require('express');
const sms = require('../controllers/vodacom.controller.js');
const router = express.Router();

router.get('/ussd', sms.ussdSMS);
router.post('/sap', sms.apiSMS);
//router.get('/feedback', sms.sendFeedback);
//router.get('/invoice', sms.sendInvoice);
//router.get('/bulk', sms.sendCoupon);
//router.post('/setid', sms.setID);
//router.post('/status', sms.updateStatus);

module.exports = router