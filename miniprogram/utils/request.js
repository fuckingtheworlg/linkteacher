const { API_BASE, STORAGE_KEYS } = require('./config');

function buildUrl(path, query) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  if (!query) return url;
  const qs = Object.keys(query)
    .filter((k) => query[k] !== undefined && query[k] !== null && query[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

/**
 * 单次原始请求（不带重试）
 */
function rawRequest({ url, method = 'GET', data, query, header = {}, requireAuth = false }) {
  const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
  if (token) header.Authorization = `Bearer ${token}`;
  if (requireAuth && !token) {
    return Promise.reject({ code: 401, message: '未登录', _needLogin: true });
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(url, query),
      method,
      data,
      header,
      success: (res) => {
        const status = res.statusCode || 0;
        if (status >= 200 && status < 300) {
          resolve(res.data);
        } else if (status === 401) {
          // token 过期或失效：清掉本地 token，让上层决定是否重试
          wx.removeStorageSync(STORAGE_KEYS.TOKEN);
          reject({ code: 401, message: '登录已过期', raw: res, _needLogin: true });
        } else {
          const message = (res.data && res.data.message) || `请求失败 (${status})`;
          console.error('[request] failed', method, url, status, res.data);
          reject({ code: status, message, raw: res });
        }
      },
      fail: (err) => {
        console.error('[request] network error', method, url, err);
        reject({ code: -1, message: err.errMsg || '网络异常', raw: err });
      },
    });
  });
}

/**
 * 带 401 自动重登 + 单次重试的请求封装
 * - 首次拿到 401（token 过期 / secret 变更）→ 清 token → 重新 wx.login 拿新 token → 重发一次
 * - 重试仍 401 → 上抛
 */
async function request(options) {
  try {
    return await rawRequest(options);
  } catch (err) {
    if (err && err._needLogin && !options._retried) {
      try {
        // 动态 require 避免 utils/auth.js 与 utils/request.js 之间的循环依赖
        const { ensureLogin } = require('./auth');
        await ensureLogin();
        return await rawRequest({ ...options, _retried: true });
      } catch (loginErr) {
        console.error('[request] auto re-login failed', loginErr);
        throw err;
      }
    }
    throw err;
  }
}

module.exports = {
  request,
  get: (url, query, opts = {}) => request({ url, method: 'GET', query, ...opts }),
  post: (url, data, opts = {}) => request({ url, method: 'POST', data, ...opts }),
  put: (url, data, opts = {}) => request({ url, method: 'PUT', data, ...opts }),
  del: (url, query, opts = {}) => request({ url, method: 'DELETE', query, ...opts }),
};
