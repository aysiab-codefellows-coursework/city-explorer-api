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
  const city = request.query.search_query;
  let select_weaSQL = 'SELECT * FROM weather WHERE search_query =$1;';
  client.query(select_weaSQL, [city])
    .then( results => {
      if(results.rows.length === 0) {
        weatherGetAPI(request, response, city);
      } else {
        response.status(200).json(results.rows);
      }
    })
    .catch(err => console.log(err))
}

function weatherGetAPI(request, response, city) {
  const WEATH_URL = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${WEATHER_API}`;
  console.log(WEATH_URL);
  superagent.get(WEATH_URL)
    .then(weather => {
      console.log('weather', weather);
      let parseWeather = JSON.parse(weather.text);
      let weatherData = parseWeather.data.map((value) => new Weather(value, city));
      response.json(weatherData);
      let SQL = 'INSERT INTO weather (search_query, forecast, clock_time) VALUES($1,$2,$3) RETURNING *;';
      weatherData.forEach(forecast => {
        let insertForecast = [forecast.search_query, forecast.forecast, forecast.time];
        client.query(SQL, insertForecast)
          .then(() => {
          })
          .catch(err => console.log(err))
      })
    })
    .catch(err => console.log(err));
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
  const city = request.query.search_query;
  let selectTrailsSQL = 'SELECT * FROM trails WHERE search_query = $1;';
  client.query(selectTrailsSQL, [city])
    .then(results => {
      if(results.rows.length === 0) {
        if(!request.query.longitude || !request.query.latitude) {
          getLonLat(request, response, city);                    
        } else {
          getTrailsAPI(request, response, city, request.query.longitude, request.query.latitude);
        }
      } else {
        response.status(200).json(results.rows);
      }
    })
}

function getTrailsAPI(request, response, city, lon, lat) {
  const TRAILS_URL = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=10&key=${TRAILS_API}`;
  superagent.get(TRAILS_URL)
    .then(trails => {
      let parseTrails = JSON.parse(trails.text);
      let trailsData = parseTrails.trails.map((value) => new Trail(value))
      response.json(trailsData);
      let SQL = 'INSERT INTO trails (search_query, trail_name, trail_location, trail_length, stars, star_votes, summary, trail_url, conditions, condition_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *;';
      trailsData.forEach(trail => {
        let insertTrail = [city, trail.name, trail.location, trail.length, trail.stars, trail.star_votes, trail.summary, trail.trail_url, trail.conditions, trail.conidtion_date];
        client.query(SQL, insertTrail)
          .then(() => {
          })
      })
    })
}

function getLonLat(request, response, city) {
  let lonLatSQL = 'SELECT longitude, latitude, search_query FROM location WHERE search_query = $1;';
  let lat;
  let lon;
  client.query(lonLatSQL, [city])
    .then(results => {
      lon = results.rows[0].longitude;
      lat = results.rows[0].latitude;
      getTrailsAPI(request, response, city, lon, lat);
    })
}


// function getTrailsAPI(request, response, city) {
//   let lonLatSQL = 'SELECT longitude, latitude, search_query FROM location WHERE search_query = $1;';
//   let lat;
//   let lon;
//   client.query(lonLatSQL, [city])
//     .then(results => {
//       console.log('results', results);
//       lon = results.rows[0].longitude;
//       lat = results.rows[0].latitude;
//       const TRAILS_URL = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=10&key=${TRAILS_API}`;
//       superagent.get(TRAILS_URL)
//         .then(trails => {
//           let parseTrails = JSON.parse(trails.text);
//           let trailsData = parseTrails.trails.map((value) => new Trail(value))
//           response.json(trailsData);
//           let SQL = 'INSERT INTO trails (search_query, trail_name, trail_location, trail_length, stars, star_votes, summary, trail_url, conditions, condition_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *;';
//           trailsData.forEach(trail => {
//             let insertTrail = [city, trail.name, trail.location, trail.length, trail.stars, trail.star_votes, trail.summary, trail.trail_url, trail.conditions, trail.conidtion_date];
//             client.query(SQL, insertTrail)
//               .then(() => {
//               })
//           })
//         })
//     })
// }




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

