const mongoose = require('mongoose');

const mongoHost = process.env.MONGO_HOST;
const mongoPort = process.env.MONGO_PORT || 27017;
const mongoUser = process.env.MONGO_USER;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoDBName = process.env.MONGO_DB_NAME;

const mongoURL = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDBName}`;

// We have to define our own SchemaType here because we want to handle cases where the input isn't not string (e.g 43, 53948)
// The built in String SchemaType automactically cast the input into a string which is not what we are looking for.
class NoCastString extends mongoose.SchemaType {
    constructor(key, options) {
        super(key, options, 'NoCastString');
    }

    cast (val) {
        if (typeof val !== "string") {
            throw new Error(`NoCastString: ${val} is not a string`);
        }
        return val;
    }
}

const connectToMongoDB = (callback) => {
    mongoose
        .connect(
            mongoURL,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useCreateIndex: true
            }
        ).then(() => {
            callback();
        }).catch((err) => {
            console.log(err);
            throw err;
        });
}

const registerNoCastString = () => {
    // Register NoCastString to the list of available SchemaType
    mongoose.Schema.Types.NoCastString = NoCastString;
}

module.exports = {
    connectToMongoDB,
    registerNoCastString
}