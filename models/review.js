const mongoose = require('mongoose');
const Campground = require('./campground');
const Schema = mongoose.Schema;
const reviewSchema = new Schema ({
    user: String,
    rating: Number, 
    text: String
});

module.exports = mongoose.model('Review', reviewSchema);