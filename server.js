'use strict';

// required 3rd party dependencies
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const { json, response } = require('express');
const pg = require('pg');

// constructing client for database
const client = new pg.Client(process.env.DATABASE_URL);


// API keys
const GEOCODE_API = process.env.GEOCODE_API_KEY;
const WEATHER_API = process.env.WEATHER_API_KEY;
const TRAILS_API = process.env.TRAILS_API_KEY;
const YELP_API = process.env.YELP_API_KEY
const MOVIE_API = process.env.MOVIE_DB_API_KEY


const app = express();

const PORT = process.env.PORT;

app.use(cors());

app.get('/', (request, response) => {
  response.send('my homepage :D');
});

// Location
app.get('/location', locationHandler);

// Location object constructor
function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.display_name;
  this.latitude = geoData.lat;
  this.longitude = geoData.lon;
}


// Handles requests for location information
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


// Retrieve location information from Geocoding API if not in SQL databae
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

// Weather object constructor
function Weather(data, city) {
  this.search_query = city;
  this.forecast = data.weather.description;
  this.time = data.datetime;
}

// Handles weather requests
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

// Retrieve Weather information via API request if it doesn't exist in SQL database
function weatherGetAPI(request, response, city) {
  const WEATH_URL = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${WEATHER_API}`;
  console.log(WEATH_URL);
  superagent.get(WEATH_URL)
    .then(weather => {
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

// Trails Object Constructor
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

// Handles request and response to for the trails API
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

// If Trails information doesn't exist in SQL database, make API request and get information
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
          .then(() => {});
      })
    })
}

// If Location information doesn't exist in SQL database, get the lon and lat to use for trails API
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


app.get('/yelp', yelpHandler);

function Yelp(data) {
  this.name = data.name;
  this.img = data.image_url;
  this.price = data.price;
  this.rating = data.rating;
  this.url = data.url;
}


function yelpHandler(request, response) {
  const city = request.query.search_query;
  let selectYelpSQL = 'SELECT * FROM yelp WHERE search_query = $1;';
  client.query(selectYelpSQL, [city])
    .then(results => {
      if(results.rows.length === 0) {
        getYelpApi(request, response, city);
      } else {
        response.status(200).json(results.rows);
      }
    })
}

function getYelpApi(request, response, city) {
  superagent
    .get(`https://api.yelp.com/v3/businesses/search?location=${city}`)
    .set('Authorization',`Bearer ${YELP_API}`)
    .then( results => {
      let parseYelp = JSON.parse(results.text);
      let yelpData = parseYelp.businesses.map(result => new Yelp(result));
      response.json(yelpData);
      let SQL = 'INSERT INTO yelp (search_query, name, img, price, rating, url) VALUES ($1,$2,$3,$4,$5,$6);';
      yelpData.forEach(result => {
        let insertYelp = [city, result.name, result.img, result.price, result.rating, result.url];
        client.query(SQL, insertYelp)
          .then(() => {});
      })
    })
}


app.get('/movies', moviesHandler);

function Movies(data) {
  this.title = data.title;
  this.overview = data.overview;
  this.average_votes = data.vote_average;
  this.total_votes = data.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
  this.populartiy = data.popularity;
  this.released = data.released_date;
}

function moviesHandler(request, response) {
  const city = request.query.search_query;
  let selectMoviesSQL = 'SELECT * FROM movies WHERE search_query = $1;';
  client.query(selectMoviesSQL,[city])
    .then( results => {
      if(results.rows.length === 0) {
        getMoviesApi(request,response, city);
      } else {
        response.status(200).json(results.rows);
      }
    })
}

function getMoviesApi(request, response, city) {
  const KEYWORD_URL = `https://api.themoviedb.org/3/search/keyword?api_key=${MOVIE_API}&query=${city}&page=1`;
  superagent.get(KEYWORD_URL)
    .then(results => {
      let parseKeyword = JSON.parse(results.text);
      const KEYWORD_ID = parseKeyword.results[0].id;
      const MOVIE_URL = `https://api.themoviedb.org/3/keyword/${KEYWORD_ID}/movies?api_key=${MOVIE_API}&language=en-US&include_adult=false`;
      superagent.get(MOVIE_URL)
        .then(movies => {
          let parseMovies = JSON.parse(movies.text);
          let movieData = parseMovies.results.map(movie => new Movies(movie));
          response.json(movieData);
          let SQL = 'INSERT INTO movies (search_query, title, overview, average_votes, total_votes, image_url, popularity, released_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8);';
          movieData.forEach(movie => {
            let insertMovie = [city, movie.title, movie.overview, movie.average_votes, movie.total_votes,movie.image_url, movie.popularity, movie.released];
            client.query(SQL, insertMovie)
              .then(() => {})
          })
        })
    })
}


// `https://api.themoviedb.org/3/keyword/${KEYWORD_ID}/movies?api_key=${MOVIE_API}&language=en-US&include_adult=false`
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

