/**
 * controllers/project.controller.js — Thin controller for project routes.
 * RULES: No business logic. asyncHandler. ApiResponse only.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as projectService from '../services/project.service.js';

export const createProject = asyncHandler(async (req, res) => {
    const project = await projectService.createProject(req.user._id, req.body);
    res.status(201).json(new ApiResponse(201, project, 'Project created successfully'));
});

export const listProjects = asyncHandler(async (req, res) => {
    const result = await projectService.listProjects(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Projects retrieved'));
});

export const getProject = asyncHandler(async (req, res) => {
    const project = await projectService.getProjectById(req.params.id);
    res.status(200).json(new ApiResponse(200, project, 'Project retrieved'));
});

export const updateProjectStatus = asyncHandler(async (req, res) => {
    const project = await projectService.updateProjectStatus(
        req.params.id,
        req.user._id,
        req.body,
    );
    res.status(200).json(new ApiResponse(200, project, 'Project status updated'));
});
