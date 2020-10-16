DROP TABLE IF EXISTS location;
DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS trails;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS yelp;

CREATE TABLE location (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    longitude DECIMAL(9,6),
    latitude DECIMAL(8,6)
);

CREATE TABLE weather (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    forecast VARCHAR(255),
    clock_time TIMESTAMP
);

CREATE TABLE trails (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    trail_name VARCHAR(255),
    trail_location VARCHAR(255),
    trail_length DECIMAL(2,1),
    stars DECIMAL(2,1),
    star_votes INTEGER,
    summary VARCHAR(255),
    trail_url VARCHAR(255),
    conditions VARCHAR(255),
    condition_date TIMESTAMP
);

CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    title VARCHAR(255),
    overview VARCHAR(1023),
    average_votes DECIMAL(3,2),
    total_votes INTEGER,
    image_url VARCHAR(255),
    popularity DECIMAL (6,4),
    released_on TIMESTAMP
);

CREATE TABLE yelp (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    name VARCHAR(255),
    img VARCHAR(255),
    price VARCHAR(5),
    rating DECIMAL(3,2),
    url VARCHAR(255)
);