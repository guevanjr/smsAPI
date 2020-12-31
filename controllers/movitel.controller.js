var smpp = require('smpp');
var session = new smpp.Session({host: '10.229.55.11', port: 9876});

// We will track connection state for re-connecting
var didConnect = false; 

session.on('connect', function(){
  didConnect = true;

  session.bind_transceiver({
      system_id: 'Punctual',
      password: 'Acb!@123',
      addr_ton: 5,
      addr_npi: 1,
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
    session = new smpp.Session({host: '10.229.55.11', port: 9876});
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

function sendSMS(from, to, text, source) {
    // in this example, from & to are integers
    // We need to convert them to String
    // and add `+` before
    
    let smsFrom = from;
    let smsTo   = to;
    
    session.submit_sm({
        source_addr: smsFrom, 
        destination_addr: smsTo, // this is very important so make sure you have included + sign before ISD code to send sms
        short_message: smsText,
        source_addr_ton: 5,
        source_addr_npi: 1,
        request_delivery: 1
    }, async function(pdu) {
        console.log('SMS Submit PDU Status: ', lookupPDUStatusKey(pdu.command_status));
        if (pdu.command_status == 0) {
            // Message successfully sent
            smsId = pdu.message_id;
            smsStatus = 'Sent';
            console.log('Message ID: ' + smsId + ' ' + smsStatus);
        } else {
            console.log('SMS Not Sent: ' + pdu.command_status)
        }
    });
}


session.on('pdu', function(pdu){

    // incoming SMS from SMSC
    if (pdu.command == 'deliver_sm') {
      
      // no '+' here
      var fromNumber = pdu.source_addr.toString();
      var toNumber = pdu.destination_addr.toString();
      
      var text = '';
      if (pdu.short_message && pdu.short_message.message) {
        text = pdu.short_message.message;
      }
      
      console.log('Movitel SMS From ' + from + ' To ' + to + ': ' + text);
    
      // Reply to SMSC that we received and processed the SMS
      session.deliver_sm_resp({ sequence_number: pdu.sequence_number });
    }
})


exports.ussdSMS = async function (req, res, id) {
    let results = req.params;
    console.log(results);

    if (req.params.number == '') {
        //No unsent SMS found
        return res.status(404).send('Nenhum registo encontrado!');
    } else {
        let smsSource = req.params.source;
        let smsText = req.params.text;
        let smsTo = req.params.number;
        let smsFrom = '90876';

        sendSMS(smsFrom, smsTo, smsText, smsSource);

        /*
        for (i = 0; i < results.rows.length; i++) {
            // Get Phone Number
            smsText = results.rows[i]["MENSAGEM"]
            sendSMS('AdeM', '258'+ results.rows[i]["CONTACTO"], smsText.substring(smsText.indexOf(';')+1), smsSource)
            await sleep(500)
        }
        */
        return res.status(200).send("SMS Submitted");
    }
};

  