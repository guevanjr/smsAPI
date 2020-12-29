var smpp = require('smpp');
var session = new smpp.Session({host: '10.201.47.17', port: 5016});

// We will track connection state for re-connecting
var didConnect = false; 

session.on('connect', function(){
  didConnect = true;

  session.bind_transceiver({
      system_id: 'PontualB',
      password: 'P@!8RTa',
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

  function sendSMS(from, to, text) {
    // in this example, from & to are integers
    // We need to convert them to String
    // and add `+` before
    
    from = from.toString();
    to   = '+' + to.toString();
    
    session.submit_sm({
        source_addr:      from,
        destination_addr: to,
        short_message:    text
    }, function(pdu) {
      console.log('Vodacom SMS PDU Status', lookupPDUStatusKey(pdu.command_status));
        if (pdu.command_status == 0) {
            // Message successfully sent
            console.log(pdu.message_id);
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
      
      console.log('Vodacom SMS From ' + from + ' To ' + to + ': ' + text);
    
      // Reply to SMSC that we received and processed the SMS
      session.deliver_sm_resp({ sequence_number: pdu.sequence_number });
    }
  })

  exports.sendText = async function (req, res, id) {
    let results = req.body;
    console.log(results);

    if (results.rows.length == 0) {
        //No unsent SMS found
        return res.status(404).send('Nenhum registo encontrado!');
    } else {
        let smsSource = 'FEEDBACK'
        let smsText = ''

        
        for (i = 0; i < results.rows.length; i++) {
            // Get Phone Number
            smsText = results.rows[i]["MENSAGEM"]
            sendSMS('AdeM', '258'+ results.rows[i]["CONTACTO"], smsText.substring(smsText.indexOf(';')+1), smsSource)
            await sleep(500)
        }

        return res.status(200).send(results.rows);
    }
};
