// Includes crypto module
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


exports.singleSMS = async function(req, res, id) {
    return res.status(200).send("TEST_SUCCESS");
};

exports.bulkSMS = async function(req, res, id) {
    return res.status(200).send("TEST_SUCCESS");
};

exports.uploadFile = async function(req, res, id) {
    return res.status(200).send("TEST_SUCCESS");
};

