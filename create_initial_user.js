// パスワードをハッシュ化（SHA-256）
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// パスワードハッシュを生成
const password = 'Taiga79@';
hashPassword(password).then(hash => {
  console.log('Password hash:', hash);
  console.log('\nSQL command to create user:');
  console.log(`
INSERT INTO users (email, password_hash, name, role, created_at)
VALUES (
  'taketai0709@gmail.com',
  '${hash}',
  '武宮太雅',
  'admin',
  datetime('now')
);
  `);
});
