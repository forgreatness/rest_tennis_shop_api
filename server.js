const http = require('http');
const app = require('./app.js');

const { connectToMongoDB } = require('./lib/mongo');

process.on('unhandledRejection', err => {
    console.log(err.name, err.message);
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    process.exit(1);
});

process.on('uncaughtException', err => {
    console.log(err.name, err.message);
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    process.exit(1);
});

const port = process.env.PORT || 3000;

const server = http.createServer(app);

connectToMongoDB(() => {    
    server.listen(port, () => {
        console.log("== Server is listenting on port: ", process.env.PORT);
    });
});