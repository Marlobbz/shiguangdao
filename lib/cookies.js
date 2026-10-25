/* 拾光岛 · Cookie 工具(不引第三方依赖) */
'use strict';

/* 'a=1; b=2' → { a: '1', b: '2' } */
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) {
      try { out[k] = decodeURIComponent(v); } catch (e) { out[k] = v; }
    }
  }
  return out;
}

/* 会话 Cookie:HttpOnly 防脚本读取,SameSite=Lax 缓解 CSRF,Path 限定全站。
   部署到 HTTPS 后设置环境变量 COOKIE_SECURE=1 追加 Secure 标记。 */
function sessionCookie(token, maxAgeSec) {
  let c = `sid=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
  if (process.env.COOKIE_SECURE === '1') c += '; Secure';
  return c;
}

function clearSessionCookie() {
  let c = 'sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
  if (process.env.COOKIE_SECURE === '1') c += '; Secure';
  return c;
}

module.exports = { parseCookies, sessionCookie, clearSessionCookie };
