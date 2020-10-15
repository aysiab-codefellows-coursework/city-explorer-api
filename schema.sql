DROP TABLE IF EXISTS location;
DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS trails;

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