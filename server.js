'use strict';

// required 3rd party dependencies
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const { json } = require('express');

// API keys
const GEOCODE_API = process.env.GEOCODE_API_KEY;
const WEATHER_API = process.env.WEATHER_API_KEY;
const TRAILS_API = process.env.TRAILS_API_KEY;

//const loc_json = require('./data/location.json');
// const weath_json = require('./data/weather.json');

const app = express();

const PORT = process.env.PORT;

app.use(cors());

app.get('/', (request, response) => {
  console.log(request.query);
  response.send('my homepage :D');
});

// Location 
app.get('/location', locationHandler);

function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.display_name;
  this.latitude = geoData.lat;
  this.longitude = geoData.lon;
}

function locationHandler(request, response) {
  const city = request.query.city;
  const GEO_URL = `https://us1.locationiq.com/v1/search.php?key=${GEOCODE_API}&q=${city}&format=json`;
  superagent.get(GEO_URL)
    .then(data => {
      const geoData = data.body[0];
      const locationData = new Location(city, geoData);
      response.json(locationData);
    })
}


// Weather
app.get('/weather', weatherHandler);

function Weather(data) {
  this.forecast = data.weather.description;
  this.time = data.datetime;
}

function weatherHandler(request, response) {
  const city = request.query.city;
  const WEATH_URL = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${WEATHER_API}`;
  superagent.get(WEATH_URL)
    .then(weather => {
      let weatherData = JSON.parse(weather.text);
      response.json(weatherData.data.map((value) => new Weather(value)));
    })
}


//Trails
app.get('/trails',trailsHandler);

function Trail(data) {
  this.name = data.name;
  this.location = data.location;
  this.length = data.length;
  this.stars = data.stars;
  this.star_votes = data.starVotes;
  this.summary = data.summary;
  this.trail_url = data.url;
  this.conditions = data.conditionStatus;
  this.conidtion_date = data.conditionDate;
}

function trailsHandler(request, response) {
  const city = request.query.city;
  const GEO_URL = `https://us1.locationiq.com/v1/search.php?key=${GEOCODE_API}&q=${city}&format=json`;
  superagent.get(GEO_URL)
    .then(data => {
      const geoData = data.body[0];
      const locationData = new Location(city, geoData);
      const TRAILS_URL = `https://www.hikingproject.com/data/get-trails?lat=${locationData.latitude}&lon=${locationData.longitude}&maxDistance=10&key=${TRAILS_API}`;
      superagent.get(TRAILS_URL)
        .then(trails => {
          let trailsData = JSON.parse(trails.text);
          response.json(trailsData.trails.map((value) => new Trail(value)));
        })
    })
}


app.use(errorHandler);

function errorHandler(error, request, response, next) {
  console.log(error);
  response.status(500).send('Something went wrong ):')
}

app.listen(PORT, () => {
  console.log(`server up: ${PORT}`);
});
