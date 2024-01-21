const Movies = require('../models/movies');
const { stringSimilarity } = require('string-similarity-js');
const { isArray } = require('lodash');
const moment = require('moment');

const filterCrewData = (crew) => {
    const crewObject = {};
    for (let index in crew) {
        const value = crew[index];
        const crewType = (index.at(-1) == 's') ? index : index + 's';
        if (isArray(value)) {
            crewObject[crewType] = {
                type: crewType,
                values: value
            }
        } else {
            crewObject[crewType] = {
                type: crewType,
                values: [value]
            }
        }
    }
    return Object.values(crewObject);
}

const filterAccessControlData = (accessControlObj) => {
    const accessControlFinalObj = {};
    for (let index in accessControlObj) {
        const value = accessControlObj[index];
        const accessType = index.toLowerCase();
        if (isArray(value)) {
            accessControlFinalObj[accessType] = {
                type: accessType,
                values: value
            }
        } else {
            accessControlFinalObj[accessType] = {
                type: accessType,
                values: [value]
            }
        }
    }
    return Object.values(accessControlFinalObj);
}

const filterMoviesData = (movies) => {
    let newMovies = [];
    const allowedKeys = ['title', 'description', 'release_date', 'genres', 'cast', 'crew', 'access_control']
    for (const movie of movies) {
        const keys = Object.keys(movie);
        let newMovie = {};
        for (const key of keys) {
            let newKey = key;
            for (const allowedKey of allowedKeys) {
                if (stringSimilarity(allowedKey, key) > 0.7) {
                    newKey = allowedKey;
                }
            }
            newMovie[newKey] = movie[key];
            if (newKey == 'crew') newMovie[newKey] = filterCrewData(newMovie[newKey]);
            if (newKey == 'access_control') newMovie[newKey] = filterAccessControlData(newMovie[newKey]);
        }
        newMovie.release_date_ts = new Date(newMovie?.release_date).getTime()
        newMovies.push(newMovie)
    }
    return newMovies;
}

module.exports = [
    {
        method: 'POST',
        path: '/movies/',
        handler: async function(request, h){
            let response = {error : 0, message: "Success!!", data: []};
            let statusCode = 201;
            try {
                const movies = filterMoviesData(request.payload);
                const findExistingMovies = {
                    $or: []
                };
                for (const movie of movies) {
                    findExistingMovies['$or'].push({
                        $and: [
                            {
                                title: { $regex: new RegExp(`.*${movie?.title}.*`), $options: "i" }
                            },
                            {
                                release_date_ts: new Date(movie?.release_date).getTime()
                            }
                        ]
                    });
                }

                const moviesAlreadyInDB = await Movies.find(findExistingMovies);

                console.log('moviesAlreadyInDB==>', JSON.stringify(moviesAlreadyInDB))

                const insertDataset = []
                const updateDataset = []
                for (const movie of movies) {
                    const movieFound = moviesAlreadyInDB.filter((obj) => stringSimilarity(movie?.title, obj?.title) > 0.7 && movie?.release_date_ts === obj?.release_date_ts)
                    console.log(movieFound)
                    if (movieFound.length > 0) {
                        let updateObj = Object.assign(movieFound[0], movie);
                        updateDataset.push({
                            updateOne: {
                                filter: {
                                    _id: movieFound[0]._id
                                },
                                update: {
                                    $set: updateObj
                                },
                                upsert: true
                            }
                        })
                    } else {
                        insertDataset.push(movie);
                    }
                }
                await Movies.bulkWrite(updateDataset);
                await Movies.insertMany(insertDataset);
                statusCode = 201;
            } catch (error) {
                response.message = 'Something wrong happened at our end!!'
                statusCode = 500;
                console.log('Error==>', error);
            }
            return h.response(response).code(statusCode);
        },
    },
    {
        method: 'DELETE',
        path: '/movies/',
        handler: async function(request, h){
            let response = {error : 0, message: "Success!!", data: []};
            let statusCode = 201;
            try {
                const movieTitle = request?.query?.title?.toLowerCase();
                const releaseDate = request?.query?.release_date?.toLowerCase();
                const deleteResult = await Movies.deleteOne({
                    $and: [
                        {
                            title: { $regex: new RegExp(`.*${movieTitle}.*`), $options: "i" }
                        },
                        {
                            release_date_ts: new Date(releaseDate).getTime()
                        }
                    ]
                });
                console.log('deleteResult==>', deleteResult);
                if (deleteResult?.deletedCount > 0) {
                    response.message = 'Deleted Successfully!'
                } else {
                    response.message = 'No Matching Movies!'
                    statusCode = 404;
                }
            } catch (error) {
                response.message = 'Something wrong happened at our end!!'
                statusCode = 500;
                console.log('Error==>', error);
            }
            return h.response(response).code(statusCode);   
        }
    },
    {
        method: 'GET',
        path: '/movies/',
        handler: async function(request, h){
            let response = {error : 0, message: "Success!!", data: []};
            let statusCode = 201;
            try {
                const role = request?.query?.role?.toLowerCase();
                const movies = await Movies.find({});
                const filterMovieDataByRole = []
                for (const movie of movies) {
                    let filteredMovieData = {
                        title: movie?.title,
                        release_date: moment(movie?.release_date_ts).format('YYYY-MM-DD')
                    };
                    const accessControlFound = movie?.access_control.filter((accessControl) => stringSimilarity(role, accessControl?.type))?.[0];
                    if (isArray(accessControlFound?.values)) {
                        for (const key of accessControlFound?.values) {
                            filteredMovieData[key] = movie[key]
                        }
                    }
                    filterMovieDataByRole.push(filteredMovieData)
                }
                response = {
                    error: 0,
                    message: "Success!!",
                    data: filterMovieDataByRole
                }
            } catch (error) {
                response.message = 'Something wrong happened at our end!!'
                statusCode = 500;
                console.log('Error==>', error);
            }
            return h.response(response).code(statusCode);   
        }
    }
]