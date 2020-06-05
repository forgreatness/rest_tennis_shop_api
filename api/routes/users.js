const express = require('express');

const { requireAuthentication, generateAuthToken } = require('../../lib/authentication');
const User = require('../models/user');

const router = express.Router();

router.post('/', requireAuthentication, (req, res, next) => {
    const newUser = new User(req.body);

    var clientAccessLevel;
    if (!req.user) {
        clientAccessLevel = 'GUEST';
    } else {
        clientAccessLevel = req.user.access_level;
    }

    if (!req.body.priviledge) {
        const err_msg = 'A priviledge path is required within the request body';
        const err = new Error(err_msg);
        err.statusCode = 400;
        err.name = 'Validation';
        next(err);        
    } else if (!req.body.password) {
        const err_msg = 'A password path is required within the request body';
        const err = new Error(err_msg);
        err.statusCode = 400;
        err.name = 'Validation';
        next(err);           
    } else if (clientAccessLevel === 'ADMIN' || newUser.priviledge === 'STANDARD' || newUser.priviledge === 'PRO') {
        newUser.setPassword(req.body.password);

        newUser
            .save()
            .then(result => {
                console.log(result);
                res.status(201).json(result);
            })
            .catch(err => {
                next(err);
            });
    } else {
        const err_msg = 'Unauthorized to create the account';
        const err = new Error(err_msg);
        err.statusCode = 403;
        err.name = 'Authorization';
        next(err);
    }
});

router.post('/login', (req, res, next) => {
    if (req.body.username && req.body.password) {
        User
            .findOne({ username: req.body.username })
            .then(user => {
                if (!user || !user.validatePassword(req.body.password)) {
                    const err_msg = 'request is unauthorized';
                    const err = new Error(err_msg);
                    err.statusCode = 401;
                    err.name = 'Authorization';
                    throw err; 
                } else {
                    res.status(200).json({
                        authToken: generateAuthToken(user._id, user.username, user.priviledge)
                    })
                }
            })
            .catch(err => {
                next(err);
            });
    } else {
        const err_msg = 'request to login must contain a body with username and password';
        const err = new Error(err_msg);
        err.statusCode = 400;
        err.name = 'Validation';
        next(err);        
    }
});

router.get('/:userId', requireAuthentication, (req, res, next) => {
    if (req.user && (req.user._id === req.params.userId || req.user.access_level === 'ADMIN')) {
        User
            .findById({ _id: req.params.userId })
            .then(result => {
                res.status(200).json({
                    user_details: result
                });
            })
            .catch(err => {
                next(err);
            });
    } else {
        const err_msg = 'request is unauthorized';
        const err = new Error(err_msg);
    
        if (!req.user) {
            err.statusCode = 401;
        } else {
            err.statusCode = 403;
        }

        err.name = 'Validation';
        next(err);    
    }
});

module.exports = router;