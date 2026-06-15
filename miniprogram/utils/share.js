/**
 * 全局统一分享配置。
 * 任何 Page 在 onShareAppMessage / onShareTimeline 里直接 return appShare() / timelineShare()
 * 即可让小程序右上角「⋯ → 转发给朋友 / 分享到朋友圈」可用。
 */
const APP_TITLE = 'LinkTeacher · 直连全球优秀独立老师';
const HOME_PATH = '/pages/teachers/index/index';

/** 转发给朋友（onShareAppMessage 返回值） */
function appShare(title, path) {
  return {
    title: title || APP_TITLE,
    path: path || HOME_PATH,
  };
}

/** 分享到朋友圈（onShareTimeline 返回值） */
function timelineShare(title, query) {
  return {
    title: title || APP_TITLE,
    query: query || '',
  };
}

module.exports = { appShare, timelineShare, APP_TITLE, HOME_PATH };
