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

    // 内部リンクを取得（この記事がリンク先となっているもの）
    const internalLinks = await c.env.DB.prepare(
      `SELECT 
        il.*,
        fa.slug as from_article_slug,
        fa.title as from_article_title,
        fa.meta_description as from_article_description,
        fa.published_at as from_article_published_at
       FROM internal_links il
       JOIN articles fa ON il.from_article_id = fa.id
       WHERE il.to_article_id = ? AND il.is_active = 1
       ORDER BY il.position ASC`
    ).bind(article.id).all();

    // 見出しと画像のマッピングを取得
    const headingImages = await c.env.DB.prepare(
      `SELECT hi.*, il.image_url, il.alt_text, il.width, il.height
       FROM heading_images hi
       JOIN image_library il ON hi.image_name = il.image_name`
    ).all();

    // 画像と内部リンクを本文に挿入
    // 重要: 画像を先に挿入してから内部リンクを挿入
    let contentWithEnhancements = article.content;
    
    // 1. まず画像を挿入
    if (headingImages.results && headingImages.results.length > 0) {
      contentWithEnhancements = insertHeadingImages(
        contentWithEnhancements,
        headingImages.results as any[]
      );
      console.log('✅ Images inserted:', headingImages.results.length);
    }
    
    // 2. 次に内部リンクを挿入
    if (internalLinks.results && internalLinks.results.length > 0) {
      contentWithEnhancements = insertInternalLinks(
        contentWithEnhancements, 
        internalLinks.results as any[]
      );
      console.log('✅ Internal links inserted:', internalLinks.results.length);
    }

    return c.json({
      success: true,
      data: {
        ...article,
        content: contentWithEnhancements,
        internal_links: internalLinks.results || [],
        heading_images: headingImages.results || []
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
 * この記事がリンク先（to_article）となっているリンクを、
 * 指定された見出し（to_heading）の下にブログカード形式で挿入する
 */
function insertInternalLinks(content: string, links: any[]): string {
  const lines = content.split('\n');
  const processedLines: string[] = [];
  
  // 見出しの直後のテキスト行を追跡
  let lastHeadingIndex = -1;
  let foundContentAfterHeading = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    processedLines.push(line);
    
    // 見出し行を検出
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      lastHeadingIndex = i;
      foundContentAfterHeading = false;
      const headingText = headingMatch[2].trim();
      
      // この見出し（to_heading）に対応する内部リンクを検索
      const matchingLinks = links.filter(link => {
        if (link.to_heading) {
          return link.to_heading === headingText;
        }
        return false;
      });
      
      // 一時的にリンク情報を保存（次の行で挿入）
      if (matchingLinks.length > 0) {
        processedLines[processedLines.length - 1] = {
          type: 'heading',
          content: line,
          links: matchingLinks
        } as any;
      }
    } else if (lastHeadingIndex >= 0 && !foundContentAfterHeading && line.trim() !== '') {
      // 見出しの直後の最初のコンテンツ行
      foundContentAfterHeading = true;
      
      // 前の行が見出しでリンクがある場合
      const prevLine = processedLines[processedLines.length - 2];
      if (prevLine && typeof prevLine === 'object' && (prevLine as any).type === 'heading') {
        const headingObj = prevLine as any;
        processedLines[processedLines.length - 2] = headingObj.content;
        
        // 空行を追加
        processedLines.push('');
        
        // ブログカードを挿入
        headingObj.links.forEach((link: any) => {
          const blogCard = generateBlogCard(link);
          processedLines.push(blogCard);
        });
        
        // 空行を追加
        processedLines.push('');
      }
    }
  }
  
  // オブジェクトとして残っている見出し行を文字列に戻す
  for (let i = 0; i < processedLines.length; i++) {
    if (typeof processedLines[i] === 'object') {
      processedLines[i] = (processedLines[i] as any).content;
    }
  }
  
  // to_headingが指定されていないリンク（記事全体へのリンク）を先頭に追加
  const articleLevelLinks = links.filter(link => !link.to_heading);
  if (articleLevelLinks.length > 0) {
    const linkLines: string[] = [''];
    articleLevelLinks.forEach(link => {
      const blogCard = generateBlogCard(link);
      linkLines.push(blogCard);
      linkLines.push('');
    });
    processedLines.unshift(...linkLines);
  }
  
  return processedLines.join('\n');
}

/**
 * ブログカードHTMLを生成する関数
 */
function generateBlogCard(link: any): string {
  const linkUrl = link.from_heading_id 
    ? `/blog/${link.from_article_slug}#${link.from_heading_id}`
    : `/blog/${link.from_article_slug}`;
  
  const description = link.from_article_description || 'この記事で詳しく解説しています。';
  const publishedDate = link.from_article_published_at 
    ? new Date(link.from_article_published_at).toLocaleDateString('ja-JP')
    : '';
  
  return `
<div class="blog-card-wrapper" style="margin: 2rem 0;">
  <a href="${linkUrl}" class="blog-card" style="display: block; text-decoration: none; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: all 0.3s ease; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div class="blog-card-content" style="padding: 1.5rem; background: white; margin: 3px; border-radius: 10px;">
      <div style="display: flex; align-items: center; margin-bottom: 0.75rem;">
        <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; margin-right: 0.5rem;">🔗 関連記事</span>
        ${publishedDate ? `<span style="color: #9ca3af; font-size: 0.875rem;">${publishedDate}</span>` : ''}
      </div>
      <h3 style="font-size: 1.25rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem; line-height: 1.4;">${link.from_article_title}</h3>
      <p style="color: #6b7280; font-size: 0.875rem; line-height: 1.6; margin-bottom: 1rem;">${description}</p>
      <div style="display: flex; align-items: center; color: #667eea; font-weight: 600; font-size: 0.875rem;">
        <span>${link.link_text}</span>
        <svg style="width: 1rem; height: 1rem; margin-left: 0.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    </div>
  </a>
</div>

<style>
  .blog-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(102, 126, 234, 0.3) !important;
  }
  
  @media (max-width: 768px) {
    .blog-card-wrapper {
      margin: 1.5rem 0 !important;
    }
    .blog-card-content {
      padding: 1rem !important;
    }
    .blog-card-content h3 {
      font-size: 1.125rem !important;
    }
  }
</style>
`.trim();
}

/**
 * H2見出し配下に画像を自動挿入する関数
 */
function insertHeadingImages(content: string, images: any[]): string {
  console.log('🖼️ insertHeadingImages called with', images.length, 'images');
  
  const lines = content.split('\n');
  const processedLines: string[] = [];
  let insertedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    processedLines.push(line);
    
    // H2見出し行を検出
    const h2Match = line.match(/^##\s+(.+)$/);
    
    if (h2Match) {
      const headingText = h2Match[1].trim();
      console.log('📝 Found H2 heading:', headingText);
      
      // この見出しに対応する画像を検索
      const matchingImage = images.find(img => {
        console.log('🔍 Comparing:', img.heading_text, '===', headingText);
        return img.heading_text === headingText;
      });
      
      if (matchingImage) {
        console.log('✅ Found matching image for heading:', headingText);
        // 見出しの直後に空行と画像を挿入
        processedLines.push('');
        processedLines.push(generateImageHtml(matchingImage));
        processedLines.push('');
        insertedCount++;
      } else {
        console.log('❌ No matching image for heading:', headingText);
      }
    }
  }
  
  console.log('🎉 Inserted', insertedCount, 'images');
  return processedLines.join('\n');
}

/**
 * 画像HTMLを生成する関数
 */
function generateImageHtml(image: any): string {
  const width = image.width || 800;
  const height = image.height || 450;
  const altText = image.alt_text || '記事の画像';
  
  return `
<figure style="margin: 2rem 0;">
  <img 
    src="${image.image_url}" 
    alt="${altText}" 
    width="${width}" 
    height="${height}"
    style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    loading="lazy"
  />
</figure>
`.trim();
}

export default publicArticlesApi;
