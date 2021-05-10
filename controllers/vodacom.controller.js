var smpp = require('smpp');
var session = new smpp.Session({
    host: '10.201.47.17', 
    port: 5016,
    auto_enquire_link_period: 100000
});
//const redis = require('redis');
//const client = redis.createClient();
const { Pool } = require('pg')
const pool = new Pool({
  user: 'adem',
  host: 'localhost',
  database: 'adem',
  password: 'AdeM123',
  port: 5432
})

var smsId = '';
var smsStatus = '';

//client.on('connect', function() {
//console.log('Redis Connected ...')
//})

// We will track connection state for re-connecting
var didConnect = false; 

session.on('connect', function(){
  didConnect = true;

  session.bind_transceiver({
      system_id: 'PontualB',
      password: 'P@!8RTa'//,
  }, function(pdu) {
    console.log('pdu status', lookupPDUStatusKey(pdu.command_status));
    if (pdu.command_status == 0) {
        console.log('Vodacom SMPP Successfully Bound')
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
    console.log('Vodacom SMPP Reconnecting ...');
    session.connect();
    session = new smpp.Session({host: '10.201.47.17', port: 5016});
  }
  
  session.on('close', function(){
    console.log('Vodacom SMPP Disconnected!')
    if (didConnect) {
      connectSMPP();
    }
  })
  
  session.on('error', function(error){
    console.log('Vodacom SMPP Error: ', error)
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
    let smsTo   = '+'.concat(to);
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
        if (pdu.command_status == 0) {
            // Message successfully submitted
            smsId = pdu.message_id;
            smsStatus = 'SEND_SUCCESS';
        } else {
            // Message submission Error
            smsStatus = 'SEND_FAILED - Error Code: ' + pdu.command_status;
        }

        updateSMSLogs(smsId, smsFrom, smsTo, smsStatus, smsSource, smsType, smsText);
        console.log(smsStatus.concat(': ', smsTo));
      });

      return smsStatus;
}

function updateSMSLogs(messageId, phoneNumber, senderId, messageStatus, messageSource, messageType, messageText) { 
    var curDateTime = new Date(Date.now()).toISOString().replace('T',' ').substr(0, 19);
    console.log(curDateTime);

    var sqlText = "INSERT INTO sms_logs(messageid, fromnumber, tonumber, status, datetime, source, type, operator, message) VALUES('" + 
        messageId + "','" + 
        phoneNumber.replace('+','') + "','" +
        senderId.replace('+','') + "','" +
        messageStatus + "','" +
        curDateTime + "','" +
        messageSource + "','" +
        messageType + 
        "','Vodacom','" + 
        messageText + "');";

    //client.RPUSH(smsId, text, fromNumber, toNumber);
    pool.query(sqlText, (err, res) => {
        console.log(err, res.rowCount) 
        //pool.end() 
    });
}

session.on('pdu', function(pdu){
  // incoming SMS from SMSC
  if (pdu.command == 'deliver_sm') {
    
    // no '+' here
    var toNumber = pdu.source_addr.toString();
    var fromNumber = pdu.destination_addr.toString();
    
    var text = '';
    if (pdu.short_message && pdu.short_message.message) {
        text = pdu.short_message.message;
        smsStatus = text.split(' ');
        console.log('Status: ' + smsStatus[7]);
    }
    
    updateSMSLogs(pdu.message_id, fromNumber.replace('+',''), toNumber.replace('+',''), smsStatus[7].replace('stat:', '').trim(), 'VODACOM_SMSC', 'DELIVRY_MSG', text);
    console.log('Vodacom SMS From ' + fromNumber + ' To ' + toNumber + ': ' + text);
  
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

exports.ussdSMS = async function (req, res, id) {
    //let results = req.body; //.params;
    //console.log(results);

    if (req.body.number == null || req.body.number == undefined) {
        //No unsent SMS found
        return res.status(404).send('Nenhum registo encontrado!');
    } else {
        let smsSource = req.body.source;
        let smsText = req.body.text;
        let smsTo = req.body.number;
        let smsFrom = req.body.from;
        let smsType = req.body.type;

        let status = sendSMS(smsFrom, smsTo, smsText, smsSource, smsType);
        console.log('SMS to ' + smsTo + ': ' + status);
        return res.status(200).send(status);
    }
};

exports.apiSMS = async function (req, res, id) {
  if (req.body.number == null || req.body.number == undefined) {
      //No unsent SMS found
      return res.status(400).send('ERR_NULL_PARAM');
  } else {
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

exports.sendText = async function (req, res, id) {
    let results = req.body;
    console.log(results);

    if (results.rows.length == 0) {
        //No unsent SMS found
        return res.status(404).send('Nenhum registo encontrado!');
    } else {
        let smsSource = 'FEEDBACK'
        let smsText = ''

        
        for (let i = 0; i < results.rows.length; i++) {
            // Get Phone Number
            smsText = results.rows[i]["MENSAGEM"]
            sendSMS('AdeM', '258'+ results.rows[i]["CONTACTO"], smsText.substring(smsText.indexOf(';')+1), smsSource)
            await sleep(500)
        }

        return res.status(200).send(results.rows);
    }
};
