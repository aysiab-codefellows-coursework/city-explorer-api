'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const loc_json = require('./data/location.json');
const weath_json = require('./data/weather.json');

const app = express();

const PORT = process.env.PORT;

app.use(cors());

app.get('/', (request, response) => {
  console.log(request.query);
  response.send('my homepage :D');
});

// Location will be replaced with an actual function
app.get('/location', locationHandler);

function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].lat;
  this.longitutde = geoData[0].lon;
}

function locationHandler(request, response) {
  const city = request.query.city;
  const locationData = new Location(city, loc_json);
  response.json(locationData);
}



app.listen(PORT, () => {
  console.log(`server up: ${PORT}`);
});
