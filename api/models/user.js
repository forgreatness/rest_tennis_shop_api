const mongoose = require('mongoose');
const crypto = require('crypto');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: Schema.Types.String,
        unique: true,
        lowercase: true,
        required: [true, 'username can not be empty'],
        match: [/^[a-zA-Z0-9]+$/, 'username is alphanumeric character with no white space'],
        index: true
    },
    email: {
        type: Schema.Types.String,
        unique: true,
        lowercase: true,
        required: [true, 'email can not be empty'],
        match: [/^\S+@\S+\.com$/, 'email is alphanunermic ending in @{string}.com'],
        index: true
    },
    salt: {
        type: Schema.Types.String,
        required: [true, 'salt must be provided']
    },
    hash: {
        type: Schema.Types.String,
        required: [true, 'hash must be provided'],
    },
    priviledge: {
        type: Schema.Types.String,
        required: [true, 'all accounts must have a access type'],
        enum: ['ADMIN', 'STANDARD', 'PRO'],
        uppercase: true
    }
});

UserSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.validatePassword = function(password) {
    let hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

UserSchema.plugin(
    uniqueValidator,
    {
        message: 'User already exists'
    }
);

module.exports = mongoose.model('User', UserSchema);