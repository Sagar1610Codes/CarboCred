/**
 * middleware/validate.middleware.js — Joi schema validation middleware factory.
 * RULES: Validation runs before controllers. Uses Joi schemas from validators/.
 */

import ApiError from '../utils/ApiError.js';

/**
 * Validates req.body, req.params, or req.query against a Joi schema.
 * @param {object} schema - Joi schema to validate against
 * @param {'body'|'params'|'query'} [source='body'] - Source of request data
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') =>
    (req, _res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map((d) => ({
                field: d.path.join('.'),
                message: d.message.replace(/['"]/g, ''),
            }));
            return next(ApiError.badRequest('Validation failed', errors));
        }

        // Replace with sanitised/validated value
        req[source] = value;
        return next();
    };

export default validate;
