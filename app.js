const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const cache = require('./cache');

const serviceAccount = require('./credentials/credential.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const initializePassport = require('./passport-config');
initializePassport(
  passport,
  email => cache.users.find(user => user.email === email),
  id => cache.users.find(user => user.id === id)
);

const indexRouter = require('./routes/menu');
const pricesRouter = require('./routes/setPrices');
const demandRouter = require('./routes/setDemands');
const sellRouter = require('./routes/sellContract');
const buyContractRouter = require('./routes/buyContract');
const sellOrderRouter = require('./routes/sellOrder');
const buyOrderRouter = require('./routes/buyOrder');
const lookupRouter = require('./routes/lookup');
const loginRouter = require('./routes/login');
const registerRouter = require('./routes/register');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/setPrices', checkAuthenticated, pricesRouter);
app.use('/setDemands', checkAuthenticated, demandRouter);
app.use('/sellContract', sellRouter);
app.use('/buyContract', buyContractRouter);
app.use('/lookup', lookupRouter);
app.use('/sellOrder', sellOrderRouter);
app.use('/buyOrder', buyOrderRouter);
app.use('/login', checkNotAuthenticated, loginRouter);
app.use('/register', checkNotAuthenticated, registerRouter);

app.get('/logout', (req, res) => {
  req.logOut();
  res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    if (req.path === '/login' || req.path === '/register') {
      res.redirect('/');
    } else {
      return next();
    }
  } else {
    if (req.path === '/login' || req.path === '/register') {
      next();
    } else {
      console.log("Redirecting");
      res.redirect('/login');
    }
  }
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}

module.exports = app;
