const mongoose = require('mongoose');
const cities = require('./cities');
const images = require('./image');
const User = require('../models/user');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');
const Review = require('../models/review');
const uri = process.env.MONGODB_URI;
mongoose.connect(uri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const sample = array => array[Math.floor(Math.random() * array.length)];


const seedDB = async () => {
    await User.deleteMany({});
    await Campground.deleteMany({});
    await Review.deleteMany({});
    for (let i = 0; i < 50; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const randomPrice = Math.floor(Math.random()*20) + 10;
        const camp = new Campground({
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            image: 'https://source.unsplash.com/collection/66979553',
            description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Hic quo voluptatem quisquam, repellendus laudantium in velit sit nemo quaerat voluptatum adipisci dolorum voluptatibus incidunt enim voluptas accusantium blanditiis cum dolores. Facilis eligendi iure incidunt facere ad illo aspernatur sapiente voluptatum beatae laudantium, quam possimus repellat, officiis ipsum sint, magni maxime fugiat provident. Officiis voluptatem esse nihil rem odit eos magni!',
            price: randomPrice
        });
        await camp.save();
    };
};

seedDB().then(() => {
    mongoose.connection.close();
});