const express = require('express');
const bodyParser = require('body-parser');

// create express app
const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
app.use(bodyParser.json())

// define a simple route
app.get('/', (req, res) => {
    res.json({"message": "Welcome to Pontual's SMS Management App"});
});

const movitelRoutes = require('./routes/movitel.routes.js');
const vodacomRoutes = require('./routes/vodacom.routes.js');

// using as middleware
app.use('/movitel', movitelRoutes);
app.use('/vodacom', vodacomRoutes);

// listen for requests
app.listen(5000, () => {
    console.log("SMS Server is listening on port 5000\n" + new Date(Date.now()).toISOString().replace('T',' ').substr(0, 19));
});