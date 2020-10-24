const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

const serviceAccount = require('./credentials/credential.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  email => users.find(user => user.email === email),
  id => users.find(user => user.id === id)
);

const users = []; // TODO : Attach to DB instead

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
//app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(checkAuthenticated);
app.use('/', indexRouter);
app.use('/admin', pricesRouter); // TODO : When admin page exists, update this
app.use('/setPrices', pricesRouter);
app.use('/setDemands', demandRouter);
app.use('/sellContract', sellRouter);
app.use('/buyContract', buyContractRouter);
app.use('/lookup', lookupRouter);
app.use('/sellOrder', sellOrderRouter);
app.use('/buyOrder', buyOrderRouter);
app.use('/login', checkNotAuthenticated, loginRouter);
app.use('/register', checkNotAuthenticated, registerRouter);

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

// TODO : Cleanup the following routes

// app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
//   successRedirect: '/',
//   failureRedirect: '/login',
//   failureFlash: true
// }));

// app.get('/register', checkNotAuthenticated, (req, res) => {
//   res.render('register.ejs');
// });

// app.post('/register', checkNotAuthenticated, async (req, res) => {
//   try {
//     const hashedPassword = await bcrypt.hash(req.body.password, 10);
//     users.push({
//       id: Date.now().toString(),
//       name: req.body.name,
//       email: req.body.email,
//       password: hashedPassword
//     });
//     res.redirect('/login');
//   } catch {
//     res.redirect('/register');
//   }
// });

app.delete('/logout', (req, res) => {
  req.logOut();
  res.redirect('/login');
})

function checkAuthenticated(req, res, next) {
  console.log("checkAuthenticated");
  console.log(req.isAuthenticated());
  console.log(req.path);
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
  console.log("checkNotAuthenticated");
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}

module.exports = app;
