const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    password: {
        type: String,
        required: true
    },
    campgrounds: [{
        type: Schema.Types.ObjectId,
        ref: "Campground"
    }],
    reviews: [{
        type: Schema.Types.ObjectId, 
        ref: "Review"
    }]
});


module.exports = mongoose.model('User', userSchema);