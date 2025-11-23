// ===================================
// 装飾テンプレートAPIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const decoration = new Hono<{ Bindings: Env }>();

/**
 * GET /api/decoration-template/css - 装飾スタイルをCSSとして取得（認証不要）
 * 注: このルートは認証不要のため、authMiddleware適用前に定義
 */
decoration.get('/css', async (c) => {
  try {
    // デフォルトスタイル（JSON形式が保存されていない場合のフォールバック）
    const defaultCSS = `
      /* カスタム装飾スタイル */
    `;

    // すべてのアクティブなテンプレートから最新のものを取得
    const template = await c.env.DB.prepare(
      'SELECT template_content FROM decoration_templates WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    ).first<{ template_content: string }>();

    if (!template || !template.template_content) {
      return c.text(defaultCSS, 200, { 'Content-Type': 'text/css' });
    }

    // JSON形式のスタイル設定をCSSに変換
    try {
      const styles = JSON.parse(template.template_content);
      const css = generateCSSFromStyles(styles);
      return c.text(css, 200, { 'Content-Type': 'text/css' });
    } catch (e) {
      // JSON形式でない場合はデフォルトCSSを返す
      return c.text(defaultCSS, 200, { 'Content-Type': 'text/css' });
    }

  } catch (error: any) {
    console.error('Get decoration CSS error:', error);
    return c.text('/* Error loading custom styles */', 500, { 'Content-Type': 'text/css' });
  }
});

// 以下のルートは認証が必要
decoration.use('*', authMiddleware);

/**
 * GET /api/decoration-template - 装飾テンプレート取得
 */
decoration.get('/', async (c) => {
  try {
    const user = c.get('user');

    const template = await c.env.DB.prepare(
      'SELECT * FROM decoration_templates WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1'
    ).bind(user.userId).first();

    return c.json<APIResponse>({
      success: true,
      data: template
    });

  } catch (error: any) {
    console.error('Get decoration template error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch decoration template'
    }, 500);
  }
});

/**
 * POST /api/decoration-template - 装飾テンプレート保存/更新
 */
decoration.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { template_content } = await c.req.json();

    if (!template_content) {
      return c.json<APIResponse>({
        success: false,
        error: 'Template content is required'
      }, 400);
    }

    // 既存のテンプレートを無効化
    await c.env.DB.prepare(
      'UPDATE decoration_templates SET is_active = 0 WHERE user_id = ?'
    ).bind(user.userId).run();

    // 新しいテンプレートを作成
    await c.env.DB.prepare(
      `INSERT INTO decoration_templates (user_id, name, description, template_content, is_active)
       VALUES (?, ?, ?, ?, 1)`
    ).bind(
      user.userId,
      'カスタム装飾テンプレート',
      'ユーザーがカスタマイズした装飾ルール',
      template_content
    ).run();

    return c.json<APIResponse>({
      success: true,
      message: 'Decoration template saved successfully'
    });

  } catch (error: any) {
    console.error('Save decoration template error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to save decoration template'
    }, 500);
  }
});

/**
 * スタイル設定オブジェクトからCSSを生成
 */
function generateCSSFromStyles(styles: any): string {
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return `
/* カスタム装飾スタイル */

/* 見出しスタイル */
.article-content h2,
.markdown-preview h2,
#article-preview-content h2 {
  color: ${styles.heading?.h2Color || '#111827'} !important;
  border-bottom: 2px solid ${styles.heading?.h2Border || '#e5e7eb'} !important;
}

.article-content h3,
.markdown-preview h3,
#article-preview-content h3 {
  color: ${styles.heading?.h3Color || '#1f2937'} !important;
  ${styles.heading?.h3Style === 'left-border' ? `border-left: 4px solid ${styles.heading.h3Color} !important; padding-left: 12px !important;` : ''}
  ${styles.heading?.h3Style === 'background' ? `background: ${hexToRgba(styles.heading.h3Color, 0.1)} !important; padding: 8px 12px !important; border-radius: 4px !important;` : ''}
  ${styles.heading?.h3Style === 'underline' ? `border-bottom: 2px solid ${styles.heading.h3Color} !important; padding-bottom: 4px !important;` : ''}
}

/* ボックススタイル - ポイント */
.article-content blockquote:has(strong:first-child:contains("💡")),
.markdown-preview blockquote:has(strong:first-child:contains("💡")),
#article-preview-content blockquote:has(strong:first-child:contains("💡")) {
  background: ${styles.box?.point?.bg || '#eff6ff'} !important;
  border: 2px solid ${styles.box?.point?.border || '#3b82f6'} !important;
  color: ${styles.box?.point?.text || '#1e40af'} !important;
  ${styles.box?.style === 'shadow' ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;' : ''}
}

/* ボックススタイル - 注意 */
.article-content blockquote:has(strong:first-child:contains("⚠️")),
.markdown-preview blockquote:has(strong:first-child:contains("⚠️")),
#article-preview-content blockquote:has(strong:first-child:contains("⚠️")) {
  background: ${styles.box?.warning?.bg || '#fffbeb'} !important;
  border: 2px solid ${styles.box?.warning?.border || '#f59e0b'} !important;
  color: ${styles.box?.warning?.text || '#92400e'} !important;
  ${styles.box?.style === 'shadow' ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;' : ''}
}

/* ボックススタイル - メリット */
.article-content blockquote:has(strong:first-child:contains("✅")),
.markdown-preview blockquote:has(strong:first-child:contains("✅")),
#article-preview-content blockquote:has(strong:first-child:contains("✅")) {
  background: ${styles.box?.success?.bg || '#f0fdf4'} !important;
  border: 2px solid ${styles.box?.success?.border || '#10b981'} !important;
  color: ${styles.box?.success?.text || '#065f46'} !important;
  ${styles.box?.style === 'shadow' ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;' : ''}
}

/* テーブルスタイル */
.article-content table,
.markdown-preview table,
#article-preview-content table {
  border: 1px solid ${styles.table?.border || '#e5e7eb'} !important;
}

.article-content th,
.markdown-preview th,
#article-preview-content th {
  background: ${styles.table?.headerBg || '#f9fafb'} !important;
  color: ${styles.table?.headerText || '#374151'} !important;
  border: 1px solid ${styles.table?.border || '#e5e7eb'} !important;
}

.article-content td,
.markdown-preview td,
#article-preview-content td {
  border: 1px solid ${styles.table?.border || '#e5e7eb'} !important;
}

${styles.table?.style === 'striped' ? `
.article-content tbody tr:nth-child(even),
.markdown-preview tbody tr:nth-child(even),
#article-preview-content tbody tr:nth-child(even) {
  background: ${styles.table.stripeBg} !important;
}` : ''}

${styles.table?.style === 'bordered' ? `
.article-content table,
.markdown-preview table,
#article-preview-content table {
  border: 2px solid ${styles.table.border} !important;
}` : ''}

/* 強調スタイル */
.article-content strong,
.markdown-preview strong,
#article-preview-content strong {
  ${styles.marker?.style === 'underline' ? `background: linear-gradient(transparent 65%, ${hexToRgba(styles.marker.color, 0.5)} 65%) !important; padding: 0 3px !important;` : ''}
  ${styles.marker?.style === 'background' ? `background: ${hexToRgba(styles.marker.color, 0.3)} !important; padding: 2px 6px !important; border-radius: 3px !important;` : ''}
}
  `;
}

export default decoration;
