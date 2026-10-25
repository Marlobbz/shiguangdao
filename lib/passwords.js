/* 拾光岛 · 密码哈希(node:crypto scrypt,无第三方依赖)
 * 存储格式:scrypt$<salt hex>$<hash hex>;校验使用 timingSafeEqual。 */
'use strict';

const crypto = require('node:crypto');

const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, KEY_LEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hash] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const derived = crypto.scryptSync(String(password), salt, KEY_LEN);
    const expected = Buffer.from(hash, 'hex');
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch (e) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
