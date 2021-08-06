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
const session = require('express-session');
const ExpressError = require('./utils/ExpressError');
const { campgroundSchema } = require('./schemas')
const catchAsync = require('./utils/catchAsync');
const morgan = require('morgan');
const MONGODB_URI = process.env.MONGODB_URI;
const port = process.env.PORT;
mongoose.connect(MONGODB_URI, {
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
app.use(session({secret: 'verySecret'}));
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

const createSession = (req, res, next) => {
    if(!req.session.username) req.session.username;
    if(!req.session.password) req.session.password;
    next();
}

app.use(createSession);

const userLoggedIn = catchAsync(async(req, res, next) => {
    try { 
        const password = req.session.password;
        const user = await User.findOne({username: req.session.username});
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
    const isLoggedIn = (req.session.password == await User.findOne({username: req.session.username}));
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
    const user = await User.findOne({username: req.session.username});
    campground.username = user.username;
    user.campgrounds.push(campground);
    await campground.save();
    await user.save();
    res.redirect(`/campgrounds/${campground._id}`);
}));

app.get('/campgrounds/:id', userLoggedIn,catchAsync(async (req, res, next) => {
    const user = req.session;
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
    req.session.username = undefined;
    req.session.username = undefined;
    res.redirect('/signin');
}))

app.post('/campgrounds/:id/reviews', userLoggedIn, catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    const review = new Review(req.body.review);
    const user = await User.findOne({username: req.session.username});
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
app.post('/signup', catchAsync(async (req, res, next) => {
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
        req.session.username = user.username;
        req.session.password = password;
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

app.listen(process.env.PORT || 5000, () => {  
    console.log(`Listening on port ${port}`);
});
