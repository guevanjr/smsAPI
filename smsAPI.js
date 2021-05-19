const express = require('express');
const bodyParser = require('body-parser');

// create express app
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
app.use(bodyParser.json())

// parse application/x-www-form-urlencoded
app.use(bodyParser.text(/*{ extended: true }*/))

// define a simple route
app.get('/', (req, res) => {
    res.json({
        "message": "Welcome to Pontual's SMS Management App"
    });
});

const movitelRoutes = require('./routes/movitel.routes.js');
const vodacomRoutes = require('./routes/vodacom.routes.js');
const publicRoutes = require('./routes/public.routes.js');
const emailRoutes = require('./routes/email.routes.js');

// using as middleware
app.use('/movitel', movitelRoutes);
app.use('/vodacom', vodacomRoutes);
app.use('/MessageService', publicRoutes);
app.use('/EmailService', emailRoutes);

// listen for requests
app.listen(5000, () => {
    console.log("SMS Server is listening on port 5000\n" + new Date(Date.now()).toISOString().replace('T',' ').substr(0, 19));
});