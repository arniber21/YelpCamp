const express = require('express');
const app = express();
const mongoose = require('mongoose');
const port = 3000;
const path = require('path');
const Campground = require('./models/campground');
app.set('view engine', 'ejs');
app.set("views", path.join(__dirname, 'views'))

mongoose.connect("mongodb://localhost:27017/YelpCamp", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error: "));
db.once("open", () => {
    console.log("Connected");
})


app.get('/', function (req, res){
    res.render('index');
});

app.get('/newcampground', async (req, res) => {
    const camp = new Campground({title: "new Campground"});
    await camp.save();
    res.send(camp);
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
});