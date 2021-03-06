var smpp = require('smpp');
var session = new smpp.Session({
    host: '10.229.63.11', 
    port: 9876,
    auto_enquire_link_period: 100000
});

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

// We will track connection state for re-connecting
var didConnect = false; 

session.on('connect', function(){
  didConnect = true;

  session.bind_transceiver({
      system_id: 'Punctual',
      password: 'Acb!@123'/*,
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
    console.log('Movitel SMPP Reconnecting');
    session.connect();
    session = new smpp.Session({host: '10.229.63.11', port: 9876});
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
            smsStatus = 'SEND_ERROR';
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
        "','Movitel','" + 
        messageText + "');";

    //client.RPUSH(smsId, text, fromNumber, toNumber);
    pool.query(sqlText, (err, res) => {
        if (err) throw err;

        console.log(res.rowCount + " row(s) inserted.") 
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
            console.log('Status: ' + smsStatus[5]);
        }
        
        updateSMSLogs(pdu.message_id, fromNumber.replace('+',''), toNumber.replace('+',''), smsStatus[5].replace('stat:', '').trim(), 'MOVITEL_SMSC', 'DELIVRY_MSG', text);
        //console.log('Vodacom SMS From ' + fromNumber + ' To ' + toNumber + ': ' + text);
        
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

    if (req.body.number == null || req.body.number == undefined) {
        //No unsent SMS found
        return res.status(400).send('Nenhum registo encontrado!');
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

  