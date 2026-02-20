/**
 * validators/project.validator.js — Joi schemas for project routes.
 */

import Joi from 'joi';

export const createProjectSchema = Joi.object({
    name: Joi.string().trim().min(3).max(200).required(),
    description: Joi.string().trim().min(20).max(5000).required(),
    location: Joi.object({
        country: Joi.string().trim().required(),
        region: Joi.string().trim().optional(),
        coordinates: Joi.object({
            lat: Joi.number().min(-90).max(90).optional(),
            lng: Joi.number().min(-180).max(180).optional(),
        }).optional(),
    }).required(),
    methodology: Joi.string().trim().min(5).max(500).required(),
    estimatedAnnualCredits: Joi.number().integer().min(1).required(),
});

export const updateProjectStatusSchema = Joi.object({
    status: Joi.string().valid('ACTIVE', 'VERIFIED', 'REJECTED', 'COMPLETED').required(),
    rejectionReason: Joi.string().trim().max(1000).when('status', {
        is: 'REJECTED',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
});

export const listProjectsQuerySchema = Joi.object({
    status: Joi.string().valid('PENDING', 'ACTIVE', 'VERIFIED', 'REJECTED', 'COMPLETED').optional(),
    country: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
});
