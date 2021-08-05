const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const cookieParser = require('cookie-parser')
const sha512 = require('hash.js/lib/hash/sha/512');
const Review = require('./models/review');
const methodOverride = require('method-override');
const Campground = require('./models/campground');
const User = require('./models/user');
const ExpressError = require('./utils/ExpressError');
const { campgroundSchema } = require('./schemas')
const catchAsync = require('./utils/catchAsync');
const morgan = require('morgan');
const port = 3000;
mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.engine('ejs', ejsMate);
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(morgan(':remote-addr :method :url :status :response-time ms - :res[content-length]'));

const validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if(error){
        const message = error.details.map( arg => (arg.message).join(','));
        console.log(message);
        throw new ExpressError(error.details, 400);
    } else{
        next();
    }
}

const userLoggedIn = catchAsync(async(req, res, next) => {
    try { 
        const password = req.cookies.password;
        const user = await User.findOne({username: req.cookies.username});
        
        if(user.password == password){
            next();
        }
        else {
            throw new ExpressError("Invalid login info", 401);
        }
    } catch(e){
        console.log(e);
        throw new ExpressError("Invalid login info", 401);
    }
    

});


app.get('/', catchAsync(async(req, res) => {
    const isLoggedIn = (req.cookies.password == await User.findOne({username: req.cookies.username}));
    console.log(isLoggedIn);
    res.render('index', {isLoggedIn});
}));
app.get('/throwerror', (req, res) => {
    getAnErrorHere();
})
app.get('/campgrounds', userLoggedIn, catchAsync(async (req, res, next) => {
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', { campgrounds });
}));
app.get('/campgrounds/new', userLoggedIn,(req, res) => {
    res.render('campgrounds/new');
});

app.post('/campgrounds', validateCampground, userLoggedIn, catchAsync(async (req, res, next) => {
    const campground = new Campground(req.body.campground);
    const user = await User.findOne({username: req.cookies.username});
    campground.username = user.username;
    user.campgrounds.push(campground);
    await campground.save();
    await user.save();
    res.redirect(`/campgrounds/${campground._id}`);
}));

app.get('/campgrounds/:id', userLoggedIn,catchAsync(async (req, res, next) => {
    const user = req.cookies;
    const campground = await Campground.findById(req.params.id).populate('reviews');
    res.render('campgrounds/show', { campground, user});
}));

app.get('/campgrounds/:id/edit', userLoggedIn, catchAsync(async (req, res, next) => {
    const campground = await Campground.findById(req.params.id);
    res.render('campgrounds/edit', { campground });
}));

app.put('/campgrounds/:id', userLoggedIn, validateCampground, catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    res.redirect(`/campgrounds/${campground._id}`)
}));

app.delete('/campgrounds/:id', userLoggedIn, catchAsync(async (req, res, next) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect('/campgrounds');
}));

app.get('/campgrounds/:id/reviews', userLoggedIn, catchAsync(async (req, res, next) => {
    const { id } = req.params;
    res.render('campgrounds/reviews/new', { id });
}));

app.post('/logout', userLoggedIn, catchAsync(async (req, res, next)=>{
    res.clearCookie('username');
    res.clearCookie('password');
    res.redirect('/');
}))

app.post('/campgrounds/:id/reviews', userLoggedIn, catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    const review = new Review(req.body.review);
    const user = await User.findOne({username: req.cookies.username});
    review.user = user.username;
    user.reviews.push(review);
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    await user.save();
    res.redirect(`/campgrounds/${campground._id}`);
}));

app.delete('/campgrounds/:id/reviews/:rID', userLoggedIn, catchAsync(async (req, res, next) => {
    const rID = req.params.rID;
    await Campground.findByIdAndUpdate(req.params.id, {$pull: { reviews: rID}});
    await Review.findByIdAndDelete(rID);
    res.redirect(`/campgrounds/${req.params.id}`);
}));

app.get('/signup', (req, res) => {
    res.render('signup');
})
app.post('/signup', userLoggedIn, catchAsync(async (req, res, next) => {
    const newUser = new User(req.body.user);
    newUser.password = sha512().update(newUser.password).digest('hex');
    await newUser.save();
    console.log(newUser);
    res.redirect('/');
}));

app.get('/signin', (req, res) => {
    res.render('signin');
});

app.post('/signin', catchAsync(async(req, res) => {
    const password = sha512().update(req.body.user.password).digest('hex');
    const user = await User.findOne({username: req.body.user.username});
    if(user.password != password){
        throw new ExpressError('Username or Password Incorrect', 401);
    } else {
        res.cookie('username', user.username);
        res.cookie('password', password);
        res.redirect('/');
    }
}));

app.all('*', (req, res, next) => { 
    next(new ExpressError('Page not Found', 404));
});

app.use(function (error, req, res, next) {
    const { statusCode = 500, message = "Something went wrong"} = error;
    console.log("500 error: ", error.message);
    res.status(statusCode).render('error', { message });
})

app.listen(port, () => {  
    console.log(`Listening on port ${port}`);
});
