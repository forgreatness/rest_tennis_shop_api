const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const { registerNoCastString } = require('./lib/mongo');

registerNoCastString();
const productRoutes = require('./api/routes/products');
const itemRoutes = require('./api/routes/items');
const userRoutes = require('./api/routes/users');
const { handleCastErrorDB, handleDuplicateFieldsDB, handleValidationErrorDB, handleInvalidPathError } = require('./lib/custom_error');
const { rateLimit } = require('./lib/rate_limiting');

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};
  
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    // Programming or other unknown error
    } else {
        // Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }
};

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(rateLimit);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Method', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }

    next();
});

app.use('/products', productRoutes);
app.use('/items', itemRoutes);
app.use('/users', userRoutes);

app.use('*', (req, res, next) => {
    const invalidPathError = handleInvalidPathError(req.originalUrl);

    next(invalidPathError);
});

app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error;

        if (err.name === 'CastError') {
            error = handleCastErrorDB(err);
        } else if (err.code === 11000) {
            error = handleDuplicateFieldsDB(err);
        } else if (err.name === 'ValidationError') {
            error = handleValidationErrorDB(err);
        } else {
            error = err;
        }

        sendErrorProd(error, res);
    }

    console.log(err);
});

module.exports = app;