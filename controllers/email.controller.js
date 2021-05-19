var nodemailer = require('nodemailer');
let response = '';
let status = 0;

exports.ademEmail = async function(req, res, id) {
    var transporter = nodemailer.createTransport({
        service: '41.77.134.147', //'mail.adem.co.mz',
        port: 25,
        auth: {
          user: 'ussd@adem.co.mz',
          pass: 'ussd123456'
        }
    });
      
    var mailOptions = {
    from: 'ussd@adem.co.mz',
    to: 'pontual.services@outlook.com',
    subject: 'Test USSD Email',
    text: 'That was easy!'
    };
    
    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        response = 'MSG801|ERR_NOT_SENT';
        status = 400;
        console.log(response + ': ' + error);
    } else {
        response = 'MSG800|SEND_SUCCESS';
        status = 200;
        console.log(response + ': ' + info.response);
    }
    });    

    return res.status(status).send(response);
};
