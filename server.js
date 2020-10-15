'use strict';

// required 3rd party dependencies
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const { json } = require('express');
const pg = require('pg');

// constructing client for database
const client = new pg.Client(process.env.DATABASE_URL);


// API keys
const GEOCODE_API = process.env.GEOCODE_API_KEY;
const WEATHER_API = process.env.WEATHER_API_KEY;
const TRAILS_API = process.env.TRAILS_API_KEY;


const app = express();

const PORT = process.env.PORT;

app.use(cors());

app.get('/', (request, response) => {
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
  let select_locSQL = 'SELECT * FROM location WHERE search_query = $1;';
  client.query(select_locSQL, [city])
    .then( results => {
      if(results.rows.length === 0) {
        locationGetAPI(request, response, city);
      } else {
        response.status(200).json(results.rows[0]);
      }
    });
}

function locationGetAPI(request,response, city) {
  const GEO_URL = `https://us1.locationiq.com/v1/search.php?key=${GEOCODE_API}&q=${city}&format=json`;
  superagent.get(GEO_URL)
    .then(data => {
      const geoData = data.body[0];
      const locationData = new Location(city, geoData);
      let SQL = 'INSERT INTO location (search_query, formatted_query, longitude, latitude) VALUES ($1, $2, $3, $4) RETURNING *;';
      let locDB = [locationData.search_query, locationData.formatted_query, locationData.longitude, locationData.latitude];
      client.query(SQL,locDB)
        .then(results => {
          response.status(200).json(results.rows[0]);
        })
    })
}

// Weather
app.get('/weather', weatherHandler);

function Weather(data, city) {
  this.search_query = city;
  this.forecast = data.weather.description;
  this.time = data.datetime;
}

function weatherHandler(request, response) {
  const city = request.query.city;
  let select_weaSQL = 'SELECT * FROM weather WHERE search_query =$1;';
  client.query(select_weaSQL, [city])
    .then( results => {
      if(results.rows.length === 0) {
        weatherGetAPI(request, response, city, select_weaSQL);
      } else {
        response.status(200).json(results.rows);
      }
    })
}

function weatherGetAPI(request, response, city, select) {
  const WEATH_URL = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${WEATHER_API}`;
  superagent.get(WEATH_URL)
    .then(weather => {
      let parseWeather = JSON.parse(weather.text);
      parseWeather.data.forEach((value) => {
        let forecast = new Weather(value, city);
        let SQL = 'INSERT INTO weather (search_query, forecast, clock_time) VALUES($1, $2, $3) RETURNING *;';
        let forecastDB = [forecast.search_query,forecast.forecast,forecast.time];
        client.query(SQL, forecastDB)
          .then(() => {
            client.query(select,[city])
              .then(results =>{
                response.status(200).json(results.rows);
              })
          })
      });

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
  let lonLatSQL = 'SELECT longitude, latitude FROM location WHERE search_query = $1;';
  let lat;
  let lon;
  client.query(lonLatSQL, [city])
    .then(results => {
      lon = results.rows[0].longitude;
      lat = results.rows[0].latitude;
      const TRAILS_URL = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=10&key=${TRAILS_API}`;
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

// connecting to our database
client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server up: ${PORT}`);
    });
  })
  .catch( err => {
    console.error('connection error:', err);
  })

