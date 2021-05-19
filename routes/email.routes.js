const express = require('express');
const email = require('../controllers/email.controller.js');
const router = express.Router();

router.post('/AdemAlert', email.ademEmail);

module.exports = router