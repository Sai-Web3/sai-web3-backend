require('dotenv').config();
require('date-utils');

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const timeout = require('connect-timeout');
const bcrypt = require('bcrypt');

const indexRouter = require('./routes/index');

var app = express();

//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORSを許可する
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use(timeout(3 * 60 * 1000));
app.use(haltOnTimedout);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // res.sendStatus(err.status || 500);
  res.status(err.status || 500).send(JSON.stringify({"message": String(err)}));
});

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

module.exports = app;
