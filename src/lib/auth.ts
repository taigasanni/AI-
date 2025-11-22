// ===================================
// 認証ユーティリティ (Web Crypto API使用)
// ===================================

import type { JWTPayload } from '../types';

/**
 * パスワードをハッシュ化 (SHA-256)
 * 本番環境ではbcryptなどを使うべきですが、Cloudflare WorkersではWeb Crypto APIを使用
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * パスワード検証
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * JWTトークン生成 (シンプルな実装)
 * 本番環境ではjose等のライブラリを使用推奨
 */
export async function generateJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encoder = new TextEncoder();
  const base64UrlEncode = (data: string) => {
    return btoa(data)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7日間有効
  }));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  );

  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureBase64 = base64UrlEncode(
    String.fromCharCode.apply(null, signatureArray as any)
  );

  return `${signatureInput}.${signatureBase64}`;
}

/**
 * JWTトークン検証
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // 署名検証
    const encoder = new TextEncoder();
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(signatureInput)
    );

    if (!isValid) {
      return null;
    }

    // ペイロード取得
    const payloadStr = atob(
      encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    );
    const payload = JSON.parse(payloadStr);

    // 有効期限チェック
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload as JWTPayload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Authorizationヘッダーからトークンを取得
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
