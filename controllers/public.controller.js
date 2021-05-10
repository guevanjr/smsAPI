// Includes crypto module
/*
const crypto = require('crypto');
  
// Defining algorithm
const algorithm = 'aes-256-cbc';
  
// Defining key
const key = crypto.randomBytes(32);
  
// Defining iv
const iv = crypto.randomBytes(16);
  
// An encrypt function
function encrypt(apiKey) {
    // Creating Cipheriv with its parameter
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    
    // Updating text
    let encrypted = cipher.update(apiKey);
    
    // Using concatenation
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Returning iv and encrypted data
    return { 
        iv: iv.toString('hex'),
        encryptedData: encrypted.toString('hex') 
    };
}
  
// A decrypt function
function decrypt(apiToken) {
    let iv = Buffer.from(apiToken.iv, 'hex');
    let encryptedText = Buffer.from(apiToken.encryptedData, 'hex');
    
    // Creating Decipher
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    
    // Updating encrypted text
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // returns data after decryption
    return decrypted.toString();
}
  
// Encrypts output
var output = encrypt("819f368f-3212-4cd1-ad27-fb0852cde6cb");
//console.log(output);
  
// Decrypts output
//console.log(decrypt(output));
*/

var smpp = require('smpp');
var session = new smpp.Session({
    host: '197.218.5.7', 
    port: 8805,
    auto_enquire_link_period: 100000
});

/*
const { Pool } = require('pg')
const pool = new Pool({
  user: 'adem',
  host: 'localhost',
  database: 'adem',
  password: 'AdeM123',
  port: 5432
})
*/

var smsId = '';
var smsStatus = '';

// We will track connection state for re-connecting
var didConnect = false; 

session.on('connect', function(){
  didConnect = true;

  session.bind_transceiver({
      system_id: 'smsbpont',
      password: 'smsbpo#2'/*,
      addr_ton: 5,
      addr_npi: 1,*/
  }, function(pdu) {
    console.log('pdu status', lookupPDUStatusKey(pdu.command_status));
    if (pdu.command_status == 0) {
        console.log('Movitel SMPP Successfully Bound')
    }
  });
})

function lookupPDUStatusKey(pduCommandStatus) {
    for (var k in smpp.errors) {
      if (smpp.errors[k] == pduCommandStatus) {
        return k
      }
    }
}

function connectSMPP() {
    console.log('Movitel BrandName SMPP Reconnecting');
    session.connect();
    session = new smpp.Session({host: '197.218.5.7', port: 8805});
}
  
session.on('close', function(){
    console.log('Movitel SMPP Disconnected')
    if (didConnect) {
      connectSMPP();
    }
})
  
session.on('error', function(error){
    console.log('Movitel SMPP Error: ', error)
    didConnect = false;
})

function sleep(milliseconds) {
    return new Promise (
        resolve => setTimeout(resolve, milliseconds)
    )
}

function isHostValid(origin) {
    let isValid = false;

    console.log('Host: ' + origin);

    if(origin.startsWith('192.168.')) {
        isValid = true;
    }

    return isValid;
}

function isTokenValid(apiToken) {
    let isValid = false;

    let tokenString = Buffer.from(apiToken.replace('Bearer ', ''), 'base64');
    let decodedToken = tokenString.toString('utf-8');
    let tokenArray = decodedToken.split('|');
    console.log(decodedToken);
    console.log('Username: ' + tokenArray[0]);
    console.log('API Key: ' + tokenArray[1]);

    if(tokenArray[0] == 'sap_sms360' && tokenArray[1] == 'kdlAsudl3xerg90ed') {
        isValid = true;
    }

    return isValid;
}

function sendSMS(from, to, text, source, type) {
    let smsFrom = from;
    let smsTo   = to;
    let smsText = text;
    let smsSource = source;
    let smsType = type;

    session.submit_sm({
        source_addr: smsFrom, 
        destination_addr: smsTo, // this is very important so make sure you have included + sign before ISD code to send sms
        short_message: smsText,
        source_addr_ton: 5,
        source_addr_npi: 1,
        registered_delivery: 1
    }, async function(pdu) {
        console.log('SMS Submit PDU Status: ', lookupPDUStatusKey(pdu.command_status));
        
        if (pdu.command_status == 0) {
            // Message successfully submitted
            smsId = pdu.message_id;
            smsStatus = 'SEND_SUCCESS';
        } else {
            // Message submission Error
            smsStatus = 'SEND_FAILED - Error Code: ' + pdu.command_status;
        }

    });

      return smsStatus;
}

session.on('pdu', function(pdu){
    // incoming SMS from SMSC
    if (pdu.command == 'deliver_sm') {
        
        // no '+' here
        //var toNumber = pdu.source_addr.toString();
        //var fromNumber = pdu.destination_addr.toString();
        
        var text = '';
        if (pdu.short_message && pdu.short_message.message) {
            text = pdu.short_message.message;
            smsStatus = text.split(' ');
            console.log('Status: ' + smsStatus[5]);
        }
               
        // Reply to SMSC that we received and processed the SMS
        session.deliver_sm_resp({ sequence_number: pdu.sequence_number });
    }
})

// Respond to an enquire link
session.on('enquire_link', function (pdu) {
    session.send(pdu.response());
    //logger.info('Responded an enquire link');
    console.log(new Date().toISOString() + ': Responded an enquire link');
});

// Response to an enquire link
session.on('enquire_link_resp', function (pdu) {
    //counter = 0;
    //logger.info('Received a response to an enquire link');
    console.log(new Date().toISOString() + ': Received a response to an enquire link');
});



exports.singleSMS = async function(req, res, id) {
    //return res.status(200).send("TEST_SUCCESS");
    if (req.body.number == null || req.body.number == undefined) {
        //No unsent SMS found
        return res.status(400).send('SEND_FAILED - Invalid or Incomplete Parameters');
    } else {
        //console.log(req)
        let reqToken = req.headers.authorization;
        let reqHost = req.headers.origin;

        if(isTokenValid(reqToken) && isHostValid(reqHost)) {
            let smsSource = req.body.source;
            let smsText = req.body.text;
            let smsTo = req.body.number;
            let smsFrom = req.body.from;
            let smsType = req.body.type;

            let status = sendSMS(smsFrom, smsTo, smsText, smsSource, smsType);
            console.log('SMS to ' + smsTo + ': ' + status);
            return res.status(200).send(status);
        } else {
            return res.status(400).send('ERR_TOKEN_HOST');
        }
    }
};

exports.bulkSMS = async function(req, res, id) {
    return res.status(200).send("TEST_SUCCESS");
};

exports.uploadFile = async function(req, res, id) {
    return res.status(200).send("TEST_SUCCESS");
};

