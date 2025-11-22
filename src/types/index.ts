// ===================================
// 型定義
// ===================================

export interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY?: string;
  JWT_SECRET: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  domain?: string;
  publish_method: 'internal' | 'wordpress' | 'manual';
  wp_endpoint?: string;
  wp_username?: string;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: number;
  project_id: number;
  type: 'outline' | 'article_draft' | 'internal_links' | 'image_mapping';
  version: string;
  name: string;
  body: string;
  params?: string; // JSON
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: number;
  project_id: number;
  keyword: string;
  search_intent?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  user_id: number; // project_id → user_id (簡易版では直接user_idを使用)
  title: string;
  slug?: string;
  status: 'draft' | 'review' | 'scheduled' | 'published';
  content?: string;
  meta_description?: string;
  og_image_url?: string;
  prompt_type?: string;
  prompt_version?: string;
  scheduled_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  seo_title?: string;
  target_keywords?: string;
  keyword?: string;
  outline?: string; // JSON文字列またはオブジェクト
}

export interface Image {
  id: number;
  project_id: number;
  url: string;
  alt_text?: string;
  title?: string;
  categories?: string; // JSON
  tags?: string; // JSON
  aspect_ratio?: string;
  created_at: string;
  updated_at: string;
}

export interface DecorationRule {
  id: number;
  project_id: number;
  name: string;
  rule_type: 'keyword' | 'pattern' | 'block';
  target_texts?: string; // JSON
  wrapper_before?: string;
  wrapper_after?: string;
  priority: number;
  is_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
