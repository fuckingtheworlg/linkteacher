/**
 * 空头像按性别回退到平台默认图（部署在站点根路径 /default-avatars/）
 */
const { API_BASE } = require('./config');

const ASSETS_BASE = String(API_BASE || '').replace(/\/api\/?$/, '') || 'https://tcbk.top';

function resolveAvatarUrl(avatarUrl, gender) {
  const url = (avatarUrl || '').trim();
  if (url) return url;
  if (gender === 'MALE') return `${ASSETS_BASE}/default-avatars/male.jpg`;
  if (gender === 'FEMALE') return `${ASSETS_BASE}/default-avatars/female.jpg`;
  return `${ASSETS_BASE}/default-avatars/logo.jpg`;
}

module.exports = { resolveAvatarUrl, ASSETS_BASE };
