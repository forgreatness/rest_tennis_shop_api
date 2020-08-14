const redis = require('redis');

const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient(redisPort, redisHost);

const rateLimitWindowMillis = 60000;
const rateLimitWindowMaxRequests = 30;

function getTokenBucket(ip) {
    return new Promise((resolve, reject) => {
        redisClient.hgetall(ip, (err, tokenBucket) => {
            if (err) {
                reject(err);
            } else {
                if (tokenBucket) {
                    tokenBucket.tokens = parseFloat(tokenBucket.tokens);
                } else {
                    tokenBucket = {
                        tokens: rateLimitWindowMaxRequests,
                        last: Date.now()
                    };
                }
                resolve(tokenBucket);
            }
        });
    });
} 

function saveTokenBucket(ip, tokenBucket) {
    return new Promise((resolve, reject) => {
        redisClient.hmset(ip, tokenBucket, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

exports.rateLimit = async function (req, res, next) {
    try {
        const tokenBucket = await getTokenBucket(req.ip);

        const timeStamp = Date.now();
        const ellapsedMillis = timeStamp - tokenBucket.last;
        const refreshRate = rateLimitWindowMaxRequests / rateLimitWindowMillis;
        tokenBucket.tokens += refreshRate * ellapsedMillis;
        tokenBucket.tokens = Math.min(rateLimitWindowMaxRequests, tokenBucket.tokens)
        tokenBucket.last = timeStamp;

        if (tokenBucket.tokens >= 1) {
            tokenBucket.tokens -= 1;
            saveTokenBucket(req.ip, tokenBucket);
            next();
        } else {
            saveTokenBucket(req.ip, tokenBucket);
            const err = new Error('request exceeds rate limit for subscription');
            err.name = 'Rate Limiting';
            err.statusCode = 429;
            next(err);
        }
    } catch (err) {
        next(err);
    }
}