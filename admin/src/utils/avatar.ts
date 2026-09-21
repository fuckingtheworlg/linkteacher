/** 空头像按性别回退到站点静态默认图（Vite public → /default-avatars/） */
export function resolveAvatarUrl(avatarUrl?: string | null, gender?: string | null) {
  const url = (avatarUrl || '').trim();
  if (url) return url;
  if (gender === 'MALE') return '/default-avatars/male.jpg';
  if (gender === 'FEMALE') return '/default-avatars/female.jpg';
  return '/default-avatars/logo.jpg';
}
