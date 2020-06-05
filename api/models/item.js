const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const itemSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "An item must be owned by a seller"],
    },
    listing: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, "An item must be part of a product listing"]
    },
    type: {
        type: Schema.Types.String,
        enum: [
            'tennis racquets', 
            'tennis balls', 
            'tennis strings', 
            'tennis grips', 
            'tennis dampener', 
            'tennis stringer', 
            'tennis ball machines',
            'tennis shoes',
            'tennis shorts',
            'tennis pants',
            'tennis skirts',
            'tennis headbands',
            'tennis jackets',
            'tennis shirts',
            'tennis hats'
        ],
        trim: true,
        required: [true, "An item must have a type"]
    },
    sex: {
        type: Schema.Types.String,
        enum: ['men', 'women', 'unisex', 'boy', 'girl'],
        required: false,
    },
    color: {
        type: Schema.Types.NoCastString,
        required: false,
        lowercase: true
    },
    brand: {
        type: Schema.Types.String,
        required: false,
        uppercase: true
    },
    author: {
        type: Schema.Types.NoCastString,
        required: false,
        uppercase: true
    },
    size: {
        type: new Schema({
            shoes: {
                type: new Schema({
                    us: {
                        type: Schema.Types.Number,
                        required: true,
                    },
                    uk: {
                        type: Schema.Types.Number,
                        required: true,
                    },
                    europe: {
                        type: Schema.Types.Number,
                        required: true
                    }
                }, {_id: false}),
            },
            tops: {
                type: new Schema({
                    neck: {
                        type: Schema.Types.Number,
                        required: true,
                    },
                    chest: {
                        type: Schema.Types.Number,
                        required: false,
                    },
                    sleeve: {
                        type: Schema.Types.Number,
                        required: false
                    },
                    original: {
                        type: Schema.Types.String,
                        required: true,
                        enum: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
                    }
                }, {_id: false})
            },
            bottoms: {
                type: new Schema({
                    waist: {
                        type: Schema.Types.Number,
                        required: false,
                    },
                    seat: {
                        type: Schema.Types.Number,
                        required: false
                    },
                    original: {
                        type: Schema.Types.String,
                        required: true,
                        enum: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
                    }
                }, {_id: false})
            }
        }, {_id: false}),
    },
    "made in": {
        type: Schema.Types.String,
        required: true,
    },
    year: {
        type: Schema.Types.Number,
        required: true,
        max: new Date().getFullYear(),
    },
    upc: {
        type: Schema.Types.String,
        required: true,
        match: [/^\d{12}$/, 'UPC are 12 digits code']
    },
    image: {
        type: Schema.Types.Buffer,
        required: true
    }
});

itemSchema.post('validate', function(next) {
    const apparels = ['shoes', 'shorts', 'pants', 'skirts', 'shirts', 'jackets'];
    var error;

    if (apparels.some((itemType) => {
        return this.type.toString().includes(itemType);
    })) {
        if (this.size) {
            if (this.type.toString().includes('shoes') && !this.size.shoes) {
                err_msg = 'An object representing shoes is required to describe the apparel size';
                error = new Error(err_msg);
            }

            if ((this.type.toString().includes('shirts') || this.type.toString().includes('jackets'))
                && !this.size.bottoms) {
                err_msg = 'An object representing bottoms is required to describe the apparel size';
                error = new Error(err_msg);
            }

            if (
                (this.type.toString().includes('shorts') || this.type.toString().includes('pants') || this.type.toString().includes('skirts'))
                && !this.size.bottoms) {
                err_msg = 'An object representing bottoms is required to describe the apparel size';
                error = new Error(err_msg);
            }
        } else {
            err_msg = 'An object representing Size is required because the item is an apparel';
            error = new Error(err_msg);
        }
    }

    if (error) {
        error.name = 'ValidationError';
        error.statusCode = 400;
        next(error);
    }
});

module.exports = mongoose.model('Item', itemSchema);