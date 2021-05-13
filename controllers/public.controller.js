const smpp = require('smpp');
var session = new smpp.Session({
    host: '197.218.5.7', 
    port: 8805,
    auto_enquire_link_period: 300000
});


const { Pool } = require('pg')
const pool = new Pool({
  user: 'adem',
  host: '162.214.149.184',
  database: 'adem',
  password: 'AdeM123',
  port: 5432
})

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
        console.log(err, res/*.rowCount*/) 
        //pool.end() 
    });
}

var didConnect = false; 

session.on('connect', function() {
  didConnect = true;

  session.bind_transceiver({
      system_id: 'smsbpont',
      password: 'smsbpo#2'/*,
      addr_ton: 5,
      addr_npi: 1,*/
  }, function(pdu) {
    console.log('pdu status', lookupPDUStatusKey(pdu.command_status));
    if (pdu.command_status == 0) {
        console.log('Movitel BrandName SMPP Successfully Bound')
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
    session = new smpp.Session({
        host: '197.218.5.7', 
        port: 8805,
        auto_enquire_link_period: 300000
    });
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
    let i = 0;
    let ipArray = [
        '192.168.30.119',   // SAP Produtivo
        '192.168.30.121',   // SAP Qualidade
        '197.219.113.211',   // My Laptop @ ITGEST network
        '197.237.202.144'   // My Laptop @ Huawei Mate Hotspot (via Vodacom)
    ]
    console.log('Host: ' + origin);

    for(i == 0; i < ipArray.length; i++) {
        if(origin == ipArray[i]) {
            isValid = true;
        }
    }

    return isValid;
}

function isTokenValid(apiToken) {
    let isValid = false;

    let tokenString = Buffer.from(apiToken.replace('Bearer ', ''), 'base64');
    let decodedToken = tokenString.toString('utf-8');
    let tokenArray = decodedToken.split('|');

    //console.log(decodedToken);
    //console.log('Username: ' + tokenArray[0]);
    //console.log('API Key: ' + tokenArray[1]);

    if(tokenArray[0] == 'sap_sms360' && tokenArray[1] == 'kdlAsudl3xerg90ed') {
        isValid = true;
    }

    return isValid;
}

function jsonResponse(response) {
    let toJSON = {
        id: [],
        text: []   
    };
  
    let statusArray = response;
  
    toJSON.id.push(statusArray[0]);
    toJSON.text.push(statusArray[1]);
  
    return toJSON;
}

function validateParameters(phoneNumber, senderNumber, messageText, messageType, messageSource) {
    let invalidCount = 0;

    if(phoneNumber == null || phoneNumber == undefined) {
        invalidCount++;
    }

    if(senderNumber == null || senderNumber == undefined) {
        invalidCount++;
    }

    if(messageText == null || messageText == undefined) {
        invalidCount++;
    }

    if(messageType == null || messageType == undefined) {
        invalidCount++;
    }

    if(messageSource == null || messageSource == undefined) {
        invalidCount++;
    }

    return invalidCount;
}

async function sendSMS (from, to, text, source, type) {       
    let smsStatus = '';
    //let results = await Promise.all([
    session.submit_sm({
        source_addr: from, 
        destination_addr: to, // this is very important so make sure you have included + sign before ISD code to send sms
        short_message: text,
        source_addr_ton: 5,
        source_addr_npi: 1,
        registered_delivery: 1
    }, async function (pdu) {
        let smsCode = pdu.message_id;
        let pduStatus = await pdu.command_status;
        console.log('1. PDU Status: ' + pduStatus);

        if (pduStatus == 0) {
            // Message successfully submitted
            updateSMSLogs(smsCode, smsFrom, smsTo, smsStatus, smsSource, smsType, smsText);
            console.log('2. SMS ID: ' + smsCode);
            //console.log('2. ' + smsStatus.concat(': ', smsTo));
            smsStatus = 'MSG900|SEND_SUCCESS';
            return smsStatus;
        } else {
            // Message submission Error
            smsStatus = 'MSG' + pduStatus + '|ERR_NOT_SENT';
            return smsStatus;
        }
    }) 
//])
    //console.log('3. PDU Status: ' + send);
    return await smsStatus;
}

session.on('pdu', function(pdu){
    // incoming SMS from SMSC
    if(pdu.command == 'submit_sm') {
        console.log('0. Enviado')
    }

    if (pdu.command == 'deliver_sm') {
        
        // no '+' here
        //var toNumber = pdu.source_addr.toString();
        //var fromNumber = pdu.destination_addr.toString();
        
        var text = '';
        var responseStatus = '';

        if (pdu.short_message && pdu.short_message.message) {
            text = pdu.short_message.message;
            responseStatus = text.split(' ');
            console.log('Status: ' + responseStatus[5]);
        }
               
        // Reply to SMSC that we received and processed the SMS
        session.deliver_sm_resp({ 
            sequence_number: pdu.sequence_number 
        });
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
    let status = 'null|null'
    let invalidCount = validateParameters(req.body.number, req.body.from, req.body.text, req.body.type, req.body.source);

    if (invalidCount > 0) {
        //No unsent SMS found
        status = 'MSG901|ERR_NULL_PARAM';
        return res.status(400).send(jsonResponse(status.split('|')));
    } else {
        let reqToken = req.headers.authorization;
        let reqHost = req.headers.origin;
        let smsStatus = '';

        if(isTokenValid(reqToken) && isHostValid(reqHost)) {
            let smsSource = req.body.source;
            let smsText = req.body.text;
            let smsTo = req.body.number;
            let smsFrom = req.body.from;
            let smsType = req.body.type;
            let smsCode = '';
            console.log(req.headers.referer);

            session.submit_sm({
                source_addr: smsFrom, 
                destination_addr: smsTo, // this is very important so make sure you have included + sign before ISD code to send sms
                short_message: smsText,
                source_addr_ton: 5,
                source_addr_npi: 1,
                registered_delivery: 1
            }, async function (pdu) {
                smsCode = pdu.message_id;
                let pduStatus = await pdu.command_status;
                console.log('1. PDU Status: ' + pdu.command_status);
        
                if (pduStatus == 0) {
                    // Message successfully submitted
                    status = 'MSG900|SEND_SUCCESS';
                    smsStatus = 'SEND_SUCCESS'
                    return res.status(200).send(jsonResponse(status.split('|')));;
                } else {
                    // Message submission Error
                    status = 'MSG' + pduStatus + '|ERR_NOT_SENT';
                    smsStatus = 'ERR_NOT_SENT';
                    return res.status(400).send(jsonResponse(status.split('|')));;
                }
            })

            updateSMSLogs(smsCode, smsFrom, smsTo, smsStatus, smsSource, smsType, smsText);
            //return res.status(200).send(status);
        } else {
            status = 'MSG902|ERR_TOKEN_HOST';
            smsStatus = 'ERR_TOKEN_HOST';
            return res.status(400).send(jsonResponse(status.split('|')));
        }

    }
};

exports.bulkSMS = async function(req, res, id) {
    return res.status(200).send("TEST_SUCCESS");
};

exports.uploadFile = async function(req, res, id) {
    return res.status(200).send("TEST_SUCCESS");
};

