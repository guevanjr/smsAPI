const express = require('express');
const sms = require('../controllers/public.controller.js');
const router = express.Router();

router.get('/SingleMessage', sms.singleSMS);
router.get('/BulkMessage', sms.bulkSMS);
router.get('/LoadMessageFile', sms.uploadFile);

module.exports = router