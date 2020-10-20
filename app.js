var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const admin = require('firebase-admin');

const serviceAccount = require('./credentials/credential.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var indexRouter = require('./routes/menu');
var pricesRouter = require('./routes/setPrices');
var demandRouter = require('./routes/setDemands');
var sellRouter = require('./routes/sellContract');
var buyContractRouter = require('./routes/buyContract');
var sellOrderRouter = require('./routes/sellOrder');
var buyOrderRouter = require('./routes/buyOrder');
var lookupRouter = require('./routes/lookup');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/admin', pricesRouter); // TODO : When admin page exists, update this
app.use('/setPrices', pricesRouter);
app.use('/setDemands', demandRouter);
app.use('/sellContract', sellRouter);
app.use('/buyContract', buyContractRouter);
app.use('/lookup', lookupRouter);
app.use('/sellOrder', sellOrderRouter);
app.use('/buyOrder', buyOrderRouter);

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

module.exports = app;
