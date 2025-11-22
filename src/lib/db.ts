// ===================================
// データベースユーティリティ
// ===================================

import type { User, Project, Keyword, Article, Prompt, Image, DecorationRule } from '../types';

/**
 * D1Result型の定義
 */
export interface D1Result<T = any> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: any;
}

/**
 * ユーザー取得 (メールアドレス)
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first<User>();
  return result || null;
}

/**
 * ユーザー取得 (ID)
 */
export async function getUserById(db: D1Database, id: number): Promise<User | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(id).first<User>();
  return result || null;
}

/**
 * ユーザー作成
 */
export async function createUser(
  db: D1Database,
  email: string,
  passwordHash: string,
  name: string,
  role: string = 'editor'
): Promise<number> {
  const result = await db.prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  ).bind(email, passwordHash, name, role).run();
  
  return result.meta?.last_row_id || 0;
}

/**
 * プロジェクト一覧取得
 */
export async function getProjectsByUserId(db: D1Database, userId: number): Promise<Project[]> {
  const result = await db.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all<Project>();
  
  return result.results || [];
}

/**
 * プロジェクト取得 (ID)
 */
export async function getProjectById(db: D1Database, projectId: number): Promise<Project | null> {
  const result = await db.prepare(
    'SELECT * FROM projects WHERE id = ?'
  ).bind(projectId).first<Project>();
  return result || null;
}

/**
 * プロジェクト作成
 */
export async function createProject(
  db: D1Database,
  userId: number,
  name: string,
  description?: string,
  domain?: string,
  publishMethod: string = 'internal'
): Promise<number> {
  const result = await db.prepare(
    'INSERT INTO projects (user_id, name, description, domain, publish_method) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, name, description || null, domain || null, publishMethod).run();
  
  return result.meta?.last_row_id || 0;
}

/**
 * プロジェクト更新
 */
export async function updateProject(
  db: D1Database,
  projectId: number,
  data: Partial<Project>
): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.domain !== undefined) {
    fields.push('domain = ?');
    values.push(data.domain);
  }
  if (data.publish_method !== undefined) {
    fields.push('publish_method = ?');
    values.push(data.publish_method);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(projectId);

  const result = await db.prepare(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  return result.success;
}

/**
 * プロジェクト削除
 */
export async function deleteProject(db: D1Database, projectId: number): Promise<boolean> {
  const result = await db.prepare(
    'DELETE FROM projects WHERE id = ?'
  ).bind(projectId).run();
  return result.success;
}

/**
 * キーワード一覧取得
 */
export async function getKeywordsByProjectId(db: D1Database, projectId: number): Promise<Keyword[]> {
  const result = await db.prepare(
    'SELECT * FROM keywords WHERE project_id = ? ORDER BY created_at DESC'
  ).bind(projectId).all<Keyword>();
  
  return result.results || [];
}

/**
 * 記事一覧取得
 */
export async function getArticlesByProjectId(db: D1Database, projectId: number): Promise<Article[]> {
  const result = await db.prepare(
    'SELECT * FROM articles WHERE project_id = ? ORDER BY created_at DESC'
  ).bind(projectId).all<Article>();
  
  return result.results || [];
}

/**
 * 記事取得 (ID)
 */
export async function getArticleById(db: D1Database, articleId: number): Promise<Article | null> {
  const result = await db.prepare(
    'SELECT * FROM articles WHERE id = ?'
  ).bind(articleId).first<Article>();
  return result || null;
}

/**
 * プロンプト取得 (プロジェクト、タイプ、アクティブ)
 */
export async function getActivePrompt(
  db: D1Database,
  projectId: number,
  type: string
): Promise<Prompt | null> {
  const result = await db.prepare(
    'SELECT * FROM prompts WHERE project_id = ? AND type = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1'
  ).bind(projectId, type).first<Prompt>();
  return result || null;
}
