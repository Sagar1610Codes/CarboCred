/**
 * services/project.service.js — Project lifecycle business logic.
 * RULES: Business logic in services. Try/catch with ApiError. Paginated lists.
 */

import Project from '../models/Project.model.js';
import { PROJECT_STATUS } from '../constants/events.js';
import ApiError from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import logger from '../utils/logger.js';

/**
 * Create a new carbon reduction project.
 */
export const createProject = async (ownerId, projectData) => {
    try {
        const project = await Project.create({ owner: ownerId, ...projectData });
        logger.info(`Project created: ${project._id} by user ${ownerId}`);
        return project;
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to create project: ${error.message}`);
    }
};

/**
 * List all projects with optional filtering and pagination.
 */
export const listProjects = async (query) => {
    try {
        const filter = {};
        if (query.status) { filter.status = query.status; }
        if (query.country) { filter['location.country'] = new RegExp(query.country, 'i'); }

        return paginate(
            query,
            (skip, limit) =>
                Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            () => Project.countDocuments(filter),
        );
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to list projects: ${error.message}`);
    }
};

/**
 * Get a single project by ID.
 */
export const getProjectById = async (projectId) => {
    try {
        const project = await Project.findById(projectId)
            .populate('owner', 'name email walletAddress')
            .populate('verifiedBy', 'name email')
            .lean();

        if (!project) { throw ApiError.notFound('Project not found'); }
        return project;
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to fetch project: ${error.message}`);
    }
};

/**
 * Update project status (VERIFIER/ADMIN only).
 */
export const updateProjectStatus = async (projectId, verifierId, { status, rejectionReason }) => {
    try {
        const project = await Project.findById(projectId);
        if (!project) { throw ApiError.notFound('Project not found'); }

        const allowedTransitions = {
            [PROJECT_STATUS.PENDING]: [PROJECT_STATUS.ACTIVE, PROJECT_STATUS.REJECTED],
            [PROJECT_STATUS.ACTIVE]: [PROJECT_STATUS.VERIFIED, PROJECT_STATUS.REJECTED],
            [PROJECT_STATUS.VERIFIED]: [PROJECT_STATUS.COMPLETED],
        };

        const allowed = allowedTransitions[project.status] || [];
        if (!allowed.includes(status)) {
            throw ApiError.badRequest(
                `Cannot transition project from "${project.status}" to "${status}"`,
            );
        }

        project.status = status;
        project.verifiedBy = verifierId;
        project.verifiedAt = new Date();
        if (rejectionReason) { project.rejectionReason = rejectionReason; }

        await project.save();
        logger.info(`Project ${projectId} status updated to ${status} by ${verifierId}`);
        return project;
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to update project status: ${error.message}`);
    }
};
