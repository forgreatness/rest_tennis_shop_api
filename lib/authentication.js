const jwt = require('jsonwebtoken');

const secretKey = 'SuperSecret';

const generateAuthToken = (id, username, priviledge) => {
    const payload = {
        _id: id,
        username: username,
        access_level: priviledge
    };

    const token = jwt.sign(payload, secretKey, { expiresIn: '24h' });
    return token;
};

const requireAuthentication = function (req, res, next) {
    const authHeader = req.get('Authorization') || '';
    const authHeaderParts = authHeader.split(' ');
    const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null;
  
    try{
      const payload = jwt.verify(token, secretKey);
      req.user = payload;
      next();
    } catch (err) {
      req.user = null;
      next();
    }
  };

module.exports = {
    generateAuthToken,
    requireAuthentication
};