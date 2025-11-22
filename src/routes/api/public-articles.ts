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
        fa.published_at as from_article_published_at,
        fa.og_image_url as from_article_image_url
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
 * 指定された見出し（to_heading）のセクションの最下部（次の見出しの直前）に挿入する
 */
function insertInternalLinks(content: string, links: any[]): string {
  console.log('📋 insertInternalLinks called with', links.length, 'links');
  
  const lines = content.split('\n');
  const processedLines: string[] = [];
  
  // 各見出しとその内容を追跡
  let currentHeading: string | null = null;
  let currentHeadingStartIndex = -1;
  const headingSections: Map<string, { startIndex: number, links: any[] }> = new Map();
  
  // まず、見出しとそれに対応する内部リンクをマッピング
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const headingText = headingMatch[2].trim();
      console.log('📝 Found heading:', headingText);
      
      // この見出しに対応する内部リンクを検索
      const matchingLinks = links.filter(link => {
        if (link.to_heading) {
          const matches = link.to_heading === headingText;
          console.log('🔍 Comparing:', link.to_heading, '===', headingText, '→', matches);
          return matches;
        }
        return false;
      });
      
      if (matchingLinks.length > 0) {
        console.log('✅ Found', matchingLinks.length, 'matching links for heading:', headingText);
        headingSections.set(headingText, { startIndex: i, links: matchingLinks });
      }
      
      currentHeading = headingText;
      currentHeadingStartIndex = i;
    }
  }
  
  // 次に、各見出しセクションの終わり（次の見出しの直前）にブログカードを挿入
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    processedLines.push(line);
    
    // 次の行が見出しかチェック
    const nextLineIndex = i + 1;
    if (nextLineIndex < lines.length) {
      const nextLine = lines[nextLineIndex];
      const nextIsHeading = nextLine.match(/^(#{1,6})\s+(.+)$/);
      
      // 次の行が見出しの場合、現在のセクションの終わり
      if (nextIsHeading) {
        // 前の見出しに対応するブログカードがあるか確認
        for (const [headingText, section] of headingSections.entries()) {
          if (section.startIndex < i && section.startIndex < nextLineIndex) {
            // このセクションの終わりにブログカードを挿入
            console.log('💡 Inserting blog cards before next heading');
            processedLines.push('');
            
            section.links.forEach((link: any) => {
              const blogCard = generateBlogCard(link);
              processedLines.push(blogCard);
              processedLines.push('');
            });
            
            // 一度挿入したら削除
            headingSections.delete(headingText);
            break;
          }
        }
      }
    }
  }
  
  // 最後のセクションに対応するブログカードを挿入（ファイルの最後）
  for (const [headingText, section] of headingSections.entries()) {
    console.log('💡 Inserting blog cards at end of document');
    processedLines.push('');
    
    section.links.forEach((link: any) => {
      const blogCard = generateBlogCard(link);
      processedLines.push(blogCard);
      processedLines.push('');
    });
  }
  
  // to_headingが指定されていないリンク（記事全体へのリンク）を先頭に追加
  const articleLevelLinks = links.filter(link => !link.to_heading);
  if (articleLevelLinks.length > 0) {
    console.log('📌 Adding', articleLevelLinks.length, 'article-level links');
    const linkLines: string[] = [''];
    articleLevelLinks.forEach(link => {
      const blogCard = generateBlogCard(link);
      linkLines.push(blogCard);
      linkLines.push('');
    });
    processedLines.unshift(...linkLines);
  }
  
  console.log('🎉 Internal links processing complete');
  return processedLines.join('\n');
}

/**
 * ブログカードHTMLを生成する関数（改善版 - アイキャッチ画像対応）
 * マークダウンパーサーがHTMLとして正しく認識できるようにする
 */
function generateBlogCard(link: any): string {
  // slugがあればslugを優先、なければIDを使用
  const articleIdentifier = link.from_article_slug || link.from_article_id;
  
  const linkUrl = link.from_heading_id 
    ? `/blog/${articleIdentifier}#${link.from_heading_id}`
    : `/blog/${articleIdentifier}`;
  
  const description = link.from_article_description || 'この記事で詳しく解説しています。';
  const publishedDate = link.from_article_published_at 
    ? new Date(link.from_article_published_at).toLocaleDateString('ja-JP')
    : '';
  
  const imageUrl = link.from_article_image_url;
  
  // 画像がある場合とない場合でレイアウトを分ける
  if (imageUrl) {
    // 画像付きレイアウト: 左側にサムネイル、右側にテキスト
    return `<div class="blog-card-wrapper" style="margin:2rem 0;padding:2px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)"><a href="${linkUrl}" style="display:flex;gap:1rem;text-decoration:none;background:white;border-radius:10px;padding:1rem;transition:all 0.3s ease" onmouseover="this.parentElement.style.transform='translateY(-4px)';this.parentElement.style.boxShadow='0 12px 24px rgba(102,126,234,0.3)'" onmouseout="this.parentElement.style.transform='translateY(0)';this.parentElement.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'"><div style="flex-shrink:0;width:120px;height:120px;overflow:hidden;border-radius:8px;background:#f3f4f6"><img src="${imageUrl}" alt="${link.from_article_title}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div><div style="flex:1;min-width:0;display:flex;flex-direction:column"><div style="display:flex;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap"><span style="display:inline-block;background:#f3f4f6;color:#4b5563;padding:0.25rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;margin-right:0.5rem">🔗 関連記事</span>${publishedDate ? `<span style="color:#9ca3af;font-size:0.875rem">${publishedDate}</span>` : ''}</div><h3 style="font-size:1.1rem;font-weight:bold;color:#1f2937;margin:0 0 0.5rem 0;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${link.from_article_title}</h3><p style="color:#6b7280;font-size:0.8rem;line-height:1.5;margin:0 0 0.75rem 0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${description}</p><div style="display:flex;align-items:center;color:#667eea;font-weight:600;font-size:0.875rem;margin-top:auto"><span>${link.link_text}</span><svg style="width:1rem;height:1rem;margin-left:0.5rem" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div></div></a></div>`;
  } else {
    // 画像なしレイアウト: 従来通りのテキストのみ
    return `<div class="blog-card-wrapper" style="margin:2rem 0;padding:2px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)"><a href="${linkUrl}" style="display:block;text-decoration:none;background:white;border-radius:10px;padding:1.5rem;transition:all 0.3s ease" onmouseover="this.parentElement.style.transform='translateY(-4px)';this.parentElement.style.boxShadow='0 12px 24px rgba(102,126,234,0.3)'" onmouseout="this.parentElement.style.transform='translateY(0)';this.parentElement.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'"><div style="display:flex;align-items:center;margin-bottom:0.75rem"><span style="display:inline-block;background:#f3f4f6;color:#4b5563;padding:0.25rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;margin-right:0.5rem">🔗 関連記事</span>${publishedDate ? `<span style="color:#9ca3af;font-size:0.875rem">${publishedDate}</span>` : ''}</div><h3 style="font-size:1.25rem;font-weight:bold;color:#1f2937;margin:0 0 0.5rem 0;line-height:1.4">${link.from_article_title}</h3><p style="color:#6b7280;font-size:0.875rem;line-height:1.6;margin:0 0 1rem 0">${description}</p><div style="display:flex;align-items:center;color:#667eea;font-weight:600;font-size:0.875rem"><span>${link.link_text}</span><svg style="width:1rem;height:1rem;margin-left:0.5rem" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div></a></div>`;
  }
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
