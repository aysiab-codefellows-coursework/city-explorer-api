'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

const PORT = process.env.PORT;

app.use('cors');

app.get('/', (request, response) => {
  response.send('my homepage');
});


