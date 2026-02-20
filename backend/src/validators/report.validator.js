/**
 * validators/report.validator.js — Joi schemas for emission report routes.
 */

import Joi from 'joi';

export const submitReportSchema = Joi.object({
    projectId: Joi.string()
        .pattern(/^[a-fA-F0-9]{24}$/)
        .required()
        .messages({ 'string.pattern.base': 'Invalid project ID' }),
    reportingPeriod: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
            'date.greater': 'End date must be after start date',
        }),
    }).required(),
    emissionsReduced: Joi.number().positive().precision(3).required(),
    creditsRequested: Joi.number().integer().min(1).required(),
    methodology: Joi.string().trim().min(20).max(2000).required(),
});

export const verifyReportSchema = Joi.object({
    status: Joi.string().valid('VERIFIED', 'REJECTED').required(),
    rejectionReason: Joi.string().trim().max(1000).when('status', {
        is: 'REJECTED',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
});
