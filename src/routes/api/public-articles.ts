// ===================================
// 公開記事API（認証不要）
// Public Articles API (No Authentication Required)
// ===================================

import { Hono } from 'hono';
import type { Env } from '../../types';

const publicArticlesApi = new Hono<{ Bindings: Env }>();

/**
 * GET /api/public/articles - 公開記事一覧を取得
 */
publicArticlesApi.get('/', async (c) => {
  try {
    // 公開済みの記事のみ取得
    const articles = await c.env.DB.prepare(
      `SELECT 
        a.id, 
        a.title, 
        a.content, 
        a.meta_description, 
        a.target_keywords, 
        a.published_at, 
        a.created_at, 
        a.updated_at,
        a.slug,
        u.name as author_name
       FROM articles a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.status = 'published'
       ORDER BY a.published_at DESC, a.created_at DESC
       LIMIT 100`
    ).all();

    return c.json({
      success: true,
      data: articles.results || []
    });

  } catch (error: any) {
    console.error('Public articles list error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch articles',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/public/articles/:id - 個別公開記事を取得（内部リンク付き）
 */
publicArticlesApi.get('/:id', async (c) => {
  try {
    const idOrSlug = c.req.param('id');

    // IDまたはslugで公開記事を取得
    const article = await c.env.DB.prepare(
      `SELECT 
        a.id, 
        a.title, 
        a.content, 
        a.meta_description, 
        a.target_keywords, 
        a.published_at, 
        a.created_at, 
        a.updated_at,
        a.slug,
        u.name as author_name
       FROM articles a 
       JOIN users u ON a.user_id = u.id 
       WHERE (a.id = ? OR a.slug = ?) AND a.status = 'published'`
    ).bind(idOrSlug, idOrSlug).first();

    if (!article) {
      return c.json({
        success: false,
        error: 'Article not found',
        message: '指定された記事は存在しないか、まだ公開されていません'
      }, 404);
    }

    // 内部リンクを取得
    const internalLinks = await c.env.DB.prepare(
      `SELECT 
        il.*,
        ta.slug as to_article_slug,
        ta.title as to_article_title
       FROM internal_links il
       JOIN articles ta ON il.to_article_id = ta.id
       WHERE il.from_article_id = ? AND il.is_active = 1
       ORDER BY il.position ASC`
    ).bind(article.id).all();

    // 内部リンクを本文に挿入
    let contentWithLinks = article.content;
    
    if (internalLinks.results && internalLinks.results.length > 0) {
      contentWithLinks = insertInternalLinks(
        article.content, 
        internalLinks.results as any[]
      );
    }

    return c.json({
      success: true,
      data: {
        ...article,
        content: contentWithLinks,
        internal_links: internalLinks.results || []
      }
    });

  } catch (error: any) {
    console.error('Public article fetch error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch article',
      message: error.message
    }, 500);
  }
});

/**
 * Markdown本文に内部リンクを挿入する関数
 */
function insertInternalLinks(content: string, links: any[]): string {
  const lines = content.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    processedLines.push(line);
    
    // 見出し行を検出
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const headingText = headingMatch[2].trim();
      
      // この見出しに対応する内部リンクを検索
      const matchingLinks = links.filter(link => {
        return link.from_heading === headingText;
      });
      
      if (matchingLinks.length > 0) {
        // 見出しの直後に空行を追加
        processedLines.push('');
        
        // 内部リンクを挿入
        matchingLinks.forEach(link => {
          const linkUrl = link.to_heading_id 
            ? `/blog/${link.to_article_slug}#${link.to_heading_id}`
            : `/blog/${link.to_article_slug}`;
          
          const linkMarkdown = `[${link.link_text}](${linkUrl})`;
          processedLines.push(`> 🔗 **関連記事:** ${linkMarkdown}`);
        });
        
        // リンクの後に空行を追加
        processedLines.push('');
      }
    }
  }
  
  return processedLines.join('\n');
}

export default publicArticlesApi;
