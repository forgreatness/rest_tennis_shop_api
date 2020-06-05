class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
  
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
      
      Error.captureStackTrace(this, this.constructor);
    }
}

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);

    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleInvalidPathError = path => {
    const message = `The requested path ${path} doesn't exist on this server!`;

    return new AppError(message, 404);
}

module.exports = {
    handleCastErrorDB,
    handleDuplicateFieldsDB,
    handleValidationErrorDB,
    handleInvalidPathError,
    AppError
};
