const express = require('express');
const sms = require('../controllers/public.controller.js');
const router = express.Router();

router.get('/SingleMessage', sms.singleSMS);
router.get('/BulkMessage', sms.bulkSMS);
router.get('/LoadMessageFile', sms.uploadFile);
//router.get('/bulk', sms.sendBulk);
//router.get('/bulk', sms.sendAlert);
//router.post('/setid', sms.setID);
//router.post('/status', sms.updateStatus);

module.exports = router