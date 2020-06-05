const express = require('express');

const Product = require('../models/product');
const { AppError } = require('../../lib/custom_error');
const { requireAuthentication } = require('../../lib/authentication');

const router = express.Router();

/*
    query: {
        "page": {
            value: default to 1,
            description: provide the page of products to fetch
        }
    }
    purpose: fetch the paged payload containing the positioned products
    condition: NONE
*/
router.get('/', (req, res, next) => {
    const PAGESIZE = 10;
    var page = parseInt(req.query.page) || 1;

    Product
        .find()
        .select('-__v')
        .then(docs => {
            const lastPage = Math.ceil(docs.length/PAGESIZE);
            page = (page < 1) ? 1 : page;
            page = (page > lastPage) ? lastPage : page;

            const start = (page - 1) * PAGESIZE;
            const end = start + PAGESIZE - 1;
            let payload = docs.slice(start, end);

            payload = payload.map(product => {
                return {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    links: {
                        details: {
                            path: `/products/${product._id}`,
                            protocol: 'HTTP',
                            method: 'GET',
                        }
                    }
                };
            });

            let links = {};
            links.firstPage = '/products/?page=1';
            if (page > 1) {
                links.prevPage = `/products/?page=${page - 1}`;
            }
            if (page < lastPage) {
                links.nextPage = `/products/?page=${page + 1}`;
            }
            links.lastPage = `/products/?page=${lastPage}`;

            let response = {
                products: payload,
                pageNumber: page,
                totalPages: lastPage,
                pageSize: PAGESIZE,
                count: docs.length,
                links: links
            };

            console.log(docs);
            res.status(200).json(response);
        })
        .catch(err => {
            next(err);
        });
});


/*
    body: Product.schema
    purpose: handle creating a new product in the database containing the provided details within the request body
    condition: request must formulate correctly to the schema of the Product collection
*/
router.post('/', requireAuthentication, (req, res, next) => {
    const product = new Product(req.body);

    if (req.user && (req.user.access_level === 'ADMIN' || req.user._id.valueOf() === req.body.seller)) {
        product
            .save()
            .then((result) => {
                let response = {
                    createdId: result._id,
                    links: {
                        details: {
                            path: `/products/${result._id}`,
                            protocol: 'HTTP',
                            method: 'GET',
                        }
                    }
                };

                console.log(result);
                res.status(201).json(response);
            })
            .catch((err) => {
                next(err);
            });
    } else {
        const err = new Error('request is unauthorized');
        err.name = 'Authorization';
        if (req.user) {
            err.statusCode = 403;
        } else {
            err.statusCode = 401;
        }
        next(err);
    }
});

/*
    params: productId,
    purpose: handle fetching details about the provided productId
    condition: NONE
*/
router.get('/:productId', (req, res, next) => {
    const id = req.params.productId;

    Product
        .findById(id)
        .select('-__v')
        .then((doc) => {
            let response = {};
            response.product = doc;

            console.log(doc);

            if (doc) {
                res.status(200).json(response);
            } else {
                res.status(404).json({message: 'No valid entry found for provided ID'});
            }
        })
        .catch((err) => {
            next(err);
        });
});

/*
    params: productId,
    purpose: handle update to existing doc, does not create one if non existed
    condition: only the specified path in schema will be updated
*/
router.patch('/:productId', requireAuthentication, (req, res, next) => {
    const id = req.params.productId;

    if (req.user) {
        Product
            .findById(id)
            .then(product => {
                if (!product) {
                    const err = new Error('No product exist for the provided productId');
                    err.statusCode = 404;
                    err.name = 'InvalidPath';
                    throw err;
                }

                if (
                    req.user.priviledge === 'ADMIN'
                    || req.user._id === product.seller.toString() && (!req.body.seller || req.body.seller === req.user._id)
                ) {
                    return Product.findByIdAndUpdate({ _id: id }, req.body, {new: true, runValidators: true, useFindAndModify: false })
                } else {
                    const err = new Error('request is unauthorized');
                    err.name = 'Authorization';
                    err.statusCode = 403;
                    throw err;
                }
            })
            .then(result => {
                console.log(result);
                res.status(201).json(result);                
            })
            .catch(err => {
                next(err);
            });
    } else {
        const err = new Error('request is unauthenticated');
        err.name = 'Authorization';
        err.statusCode = 401;
        next(err);
    }
});

/*
    params: productId
    purpose: handle update to existing doc but also allow creating a new one if non existed
    condition: all required path must be specified within the request body
*/
router.put('/:productId', requireAuthentication, (req, res, next) => {
    const id = req.params.productId;
    const newProduct = new Product(req.body);
    newProduct._id = id

    if (req.user) {
        newProduct
            .validate()
            .then(result => {
                return Product.findById(id);
            })
            .then(product => {
                if (
                    req.user.access_level === 'ADMIN' 
                    || (req.user._id === product.seller.toString() && newProduct.seller.toString() === req.user._id)
                ) {
                    return Product.replaceOne({ _id: id }, newProduct, { upsert: true });
                } else {
                    const err = new Error('request is unauthorized');
                    err.name = 'Authorization';
                    err.statusCode = 403;
                    throw err;                    
                }
            })
            .then(result => {
                console.log(result);
                res.status(200).json(result);
            })
            .catch(err => {
                next(err);
            })
    } else {
        const err = new Error('request is unauthenticated');
        err.name = 'Athorization';
        err.statusCode = 401;
        next(err);
    }
});


/*
    params: productId
    purpose: handle removal of information about the provided productId
    condition: all relation to the product should also be remove
*/
router.delete('/:productId', requireAuthentication, (req, res, next) => {
    const id = req.params.productId;
    
    if (req.user) {
        Product
            .findById(id)
            .then(product => {
                if (!product) {
                    const err = new Error('No product exist for the provided productId');
                    err.statusCode = 404;
                    err.name = 'InvalidPath';
                    throw err;
                }

                if (req.user.access_level === 'ADMIN' || req.user._id === product.seller.toString()) {
                    // TODO: If you remove the product, then what about all the items that are related to the product
                    return Product.deleteMany({ _id: id }); 
                } else {
                    const err = new Error('request is unauthorized');
                    err.name = 'Authorization';
                    err.statusCode = 403;
                    throw err;
                }
            })
            .then(result => {
                let response = {
                    deletedCount: result.deletedCount
                };
    
                console.log(result);
                res.status(200).json(response);
            })
            .catch(err => {
                next(err);
            });
    } else {
        const err = new Error('request is unauthenticated');
        err.name = 'Authorization';
        err.statusCode = 401;
        next(err);
    }
});

module.exports = router;