const mongoose = require('mongoose');
const { Schema } = mongoose;

const MoviesSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    release_date_ts: {
        type: Number,
    },
    genres: {
        type: Array,
    },
    cast: {
        type: Array,
    },
    crew: {
        type: Array,
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Movies', MoviesSchema, 'movies');