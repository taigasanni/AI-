// ===================================
// プロジェクト管理APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse, Project } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import {
  getProjectsByUserId,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from '../../lib/db';

const projects = new Hono<{ Bindings: Env }>();

// 全ルートに認証ミドルウェア適用
projects.use('*', authMiddleware);

/**
 * GET /api/projects - プロジェクト一覧取得
 */
projects.get('/', async (c) => {
  try {
    const user = c.get('user');
    const projectList = await getProjectsByUserId(c.env.DB, user.userId);

    return c.json<APIResponse>({
      success: true,
      data: projectList
    });

  } catch (error: any) {
    console.error('Get projects error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch projects'
    }, 500);
  }
});

/**
 * GET /api/projects/:id - プロジェクト詳細取得
 */
projects.get('/:id', async (c) => {
  try {
    const projectId = parseInt(c.req.param('id'));
    const user = c.get('user');

    const project = await getProjectById(c.env.DB, projectId);

    if (!project) {
      return c.json<APIResponse>({
        success: false,
        error: 'Project not found'
      }, 404);
    }

    // アクセス権限チェック
    if (project.user_id !== user.userId && user.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    return c.json<APIResponse>({
      success: true,
      data: project
    });

  } catch (error: any) {
    console.error('Get project error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch project'
    }, 500);
  }
});

/**
 * POST /api/projects - プロジェクト作成
 */
projects.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { name, description, domain, publish_method } = await c.req.json();

    // バリデーション
    if (!name || name.trim().length === 0) {
      return c.json<APIResponse>({
        success: false,
        error: 'Project name is required'
      }, 400);
    }

    const projectId = await createProject(
      c.env.DB,
      user.userId,
      name,
      description,
      domain,
      publish_method || 'internal'
    );

    if (!projectId) {
      return c.json<APIResponse>({
        success: false,
        error: 'Failed to create project'
      }, 500);
    }

    const newProject = await getProjectById(c.env.DB, projectId);

    return c.json<APIResponse>({
      success: true,
      data: newProject,
      message: 'Project created successfully'
    }, 201);

  } catch (error: any) {
    console.error('Create project error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to create project'
    }, 500);
  }
});

/**
 * PUT /api/projects/:id - プロジェクト更新
 */
projects.put('/:id', async (c) => {
  try {
    const projectId = parseInt(c.req.param('id'));
    const user = c.get('user');
    const updateData = await c.req.json();

    // プロジェクト存在確認
    const project = await getProjectById(c.env.DB, projectId);
    if (!project) {
      return c.json<APIResponse>({
        success: false,
        error: 'Project not found'
      }, 404);
    }

    // アクセス権限チェック
    if (project.user_id !== user.userId && user.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    // 更新実行
    const success = await updateProject(c.env.DB, projectId, updateData);
    if (!success) {
      return c.json<APIResponse>({
        success: false,
        error: 'Failed to update project'
      }, 500);
    }

    const updatedProject = await getProjectById(c.env.DB, projectId);

    return c.json<APIResponse>({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    });

  } catch (error: any) {
    console.error('Update project error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update project'
    }, 500);
  }
});

/**
 * DELETE /api/projects/:id - プロジェクト削除
 */
projects.delete('/:id', async (c) => {
  try {
    const projectId = parseInt(c.req.param('id'));
    const user = c.get('user');

    // プロジェクト存在確認
    const project = await getProjectById(c.env.DB, projectId);
    if (!project) {
      return c.json<APIResponse>({
        success: false,
        error: 'Project not found'
      }, 404);
    }

    // アクセス権限チェック
    if (project.user_id !== user.userId && user.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    // 削除実行
    const success = await deleteProject(c.env.DB, projectId);
    if (!success) {
      return c.json<APIResponse>({
        success: false,
        error: 'Failed to delete project'
      }, 500);
    }

    return c.json<APIResponse>({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete project error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete project'
    }, 500);
  }
});

export default projects;
