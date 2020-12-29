var smpp = require('smpp');
var session = new smpp.Session({host: '0.0.0.0', port: 9500});

// We will track connection state for re-connecting
var didConnect = false; 

session.on('connect', function(){
  didConnect = true;

  session.bind_transceiver({
      system_id: 'USER_NAME',
      password: 'USER_PASSWORD',
  }, function(pdu) {
    console.log('pdu status', lookupPDUStatusKey(pdu.command_status));
    if (pdu.command_status == 0) {
        console.log('Successfully bound')
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
    console.log('smpp reconnecting');
    session.connect();
  }
  
  session.on('close', function(){
    console.log('smpp disconnected')
    if (didConnect) {
      connectSMPP();
    }
  })
  
  session.on('error', function(error){
    console.log('smpp error', error)
    didConnect = false;
  })


  function sendSMS(from, to, text) {
    // in this example, from & to are integers
    // We need to convert them to String
    // and add `+` before
    
    from = '+' + from.toString();
    to   = '+' + to.toString();
    
    session.submit_sm({
        source_addr:      from,
        destination_addr: to,
        short_message:    text
    }, function(pdu) {
      console.log('sms pdu status', lookupPDUStatusKey(pdu.command_status));
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
      
      console.log('SMS ' + from + ' -> ' + to + ': ' + text);
    
      // Reply to SMSC that we received and processed the SMS
      session.deliver_sm_resp({ sequence_number: pdu.sequence_number });
    }
  })

  