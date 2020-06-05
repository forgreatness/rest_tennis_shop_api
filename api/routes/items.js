const express = require('express');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const { requireAuthentication } = require('../../lib/authentication');

const User = require('../models/user');
const Item = require('../models/item');
const Product = require('../models/product');

const router = express.Router();

const fileTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif'
};

const upload = multer({
    storage: multer.diskStorage({
        destination: `${__dirname}/../../items_images`,
        filename: (req, file, callback) => {
            const basename = crypto.pseudoRandomBytes(16).toString('hex');
            const extension = fileTypes[file.mimetype];
            callback(null, `${basename}.${extension}`);
        }
    }),
    fileFilter: (req, file, callback) => {
        callback(null, !!fileTypes[file.mimetype])
    }
});

const removeUploadedFile = (file) => {
    return new Promise((resolve, reject) => {
        fs.unlink(file.path, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

router.post('/', requireAuthentication, upload.single('photo'), async (req, res, next) => {
    if (req.user) {
        req.body.owner = (req.body.owner || req.user._id);
        req.body = JSON.parse(JSON.stringify(req.body))

        if (req.file) {
            const photoData = fs.readFileSync(req.file.path);
            req.body.image = photoData
        }

        const newItem = new Item(req.body);

        await removeUploadedFile(req.file);

        // Validate the signedin user have permission
        if (req.user.access_level === 'ADMIN' || req.user._id === newItem.owner.toString()) {
            // Validate if the user and product exist
            User
                .exists({ _id: newItem.owner })
                .then(result => {
                    if (!result) {
                        const err = new Error('owner does not exist');
                        err.name = 'Validation';
                        err.statusCode = 400;
                        next(err);    
                    }

                    return Product.exists({ _id: newItem.listing });
                })
                .then(result => {
                    if (!result) {
                        const err = new Error('listing does not exist');
                        err.name = 'Validation';
                        err.statusCode = 400;
                        next(err);    
                    }

                    return newItem.save();
                })
                .then(result => {
                    console.log(result);
                    res.status(201).json(result);
                })
                .catch(err => {
                    next(err);
                });
        } else {
            const err = new Error('request is unauthorized');
            err.name = 'Authorization';
            err.statusCode = 403;
            next(err);            
        }
    } else {
        const err = new Error('request is unauthenticated');
        err.name = 'Authorization';
        err.statusCode = 401;
        next(err);
    }
});

module.exports = router;