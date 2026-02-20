/**
 * utils/ApiError.js — Custom error class for structured API errors.
 * RULES: Always throw ApiError (never plain Error) in services and middleware.
 */

class ApiError extends Error {
    /**
     * @param {number} statusCode - HTTP status code
     * @param {string} message - Human-readable error message
     * @param {Array} [errors=[]] - Validation or field-level errors
     * @param {string} [stack=''] - Optional custom stack trace
     */
    constructor(statusCode, message, errors = [], stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.success = false;
        this.data = null;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    static badRequest(message, errors = []) {
        return new ApiError(400, message, errors);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }

    static notFound(message = 'Resource not found') {
        return new ApiError(404, message);
    }

    static conflict(message = 'Resource already exists') {
        return new ApiError(409, message);
    }

    static internal(message = 'Internal server error') {
        return new ApiError(500, message);
    }
}

export default ApiError;
