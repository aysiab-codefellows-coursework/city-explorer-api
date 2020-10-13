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

function Location(city) {
  this.search_query = city;
  this.formatted_query = loc_json[0].display_name;
  this.latitude = loc_json[0].lat;
  this.longitude = loc_json[0].lon;
}

function locationHandler(request, response) {
  const city = request.query.city.a;
  const locationData = new Location(city);
  response.json(locationData);
}


app.get('/weather', weatherHandler);

function Weather(data) {
  this.forecast = data.weather.description;
  this.time = data.datetime;
}

function weatherHandler(request, response) {
  // const city = request.query.city;
  response.json(weath_json.data.map((value) => new Weather(value)));
}

app.use(errorHandler);

function errorHandler(error, request, response, next) {
  console.log(error);
  response.status(500).send('Something went wrong ):')
}

app.listen(PORT, () => {
  console.log(`server up: ${PORT}`);
});
