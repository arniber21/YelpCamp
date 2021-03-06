const mongoose = require('mongoose');
const Review = require('./review');
const Schema = mongoose.Schema;

const CampgroundSchema = new Schema({
    title: String,
    price: Number, 
    description: String, 
    location: String, 
    image: String,
    username: String,
    reviews: 
        [{
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }]
    
});

module.exports = mongoose.model('Campground', CampgroundSchema);