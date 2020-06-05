const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: Schema.Types.NoCastString,
        required: [true, 'Product name required'],
        validate: {
            validator: (value) => {
                return value.length >= 3;
            },
            message: 'input does not meet the minimum required length'
        }
    },
    price: {
        type: Schema.Types.Number,
        required: true,
        unique: false,      
    },
    seller: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'a product needs to have a seller']
    }
});

module.exports = mongoose.model('Product', productSchema);