// ===================================
// Markdown見出し抽出ユーティリティ
// ===================================

export interface Heading {
  level: number;
  text: string;
  id: string;
  position: number;
}

/**
 * Markdownテキストから見出しを抽出
 * @param markdown Markdownテキスト
 * @returns 見出しの配列
 */
export function extractHeadings(markdown: string): Heading[] {
  if (!markdown) return [];

  const headings: Heading[] = [];
  const lines = markdown.split('\n');
  let position = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // ## 形式の見出しをマッチ
    const hashMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hashMatch) {
      const level = hashMatch[1].length;
      const text = hashMatch[2].trim();
      const id = generateHeadingId(text);
      
      headings.push({
        level,
        text,
        id,
        position: position++
      });
    }
  }

  return headings;
}

/**
 * 見出しテキストからID（anchor）を生成
 * @param text 見出しテキスト
 * @returns ID文字列
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s-]/g, '') // 英数字、ひらがな、カタカナ、漢字、スペース、ハイフンのみ残す
    .replace(/\s+/g, '-') // スペースをハイフンに
    .replace(/-+/g, '-') // 連続するハイフンを1つに
    .replace(/^-|-$/g, ''); // 前後のハイフンを削除
}

/**
 * 記事IDから見出しを取得してキャッシュに保存
 * @param articleId 記事ID
 * @param content 記事内容（Markdown）
 * @param db D1Database
 */
export async function cacheArticleHeadings(
  articleId: number,
  content: string,
  db: D1Database
): Promise<void> {
  // 既存のキャッシュを削除
  await db.prepare(
    'DELETE FROM article_headings WHERE article_id = ?'
  ).bind(articleId).run();

  // 見出しを抽出
  const headings = extractHeadings(content);

  // キャッシュに保存
  for (const heading of headings) {
    await db.prepare(
      `INSERT INTO article_headings 
       (article_id, heading_level, heading_text, heading_id, position) 
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      articleId,
      heading.level,
      heading.text,
      heading.id,
      heading.position
    ).run();
  }
}

/**
 * キャッシュから記事の見出しを取得
 * @param articleId 記事ID
 * @param db D1Database
 * @returns 見出しの配列
 */
export async function getArticleHeadings(
  articleId: number,
  db: D1Database
): Promise<Heading[]> {
  const result = await db.prepare(
    `SELECT heading_level, heading_text, heading_id, position 
     FROM article_headings 
     WHERE article_id = ? 
     ORDER BY position ASC`
  ).bind(articleId).all();

  return (result.results || []).map((row: any) => ({
    level: row.heading_level,
    text: row.heading_text,
    id: row.heading_id,
    position: row.position
  }));
}
