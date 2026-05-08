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

function request({ url, method = 'GET', data, query, header = {}, requireAuth = false }) {
  const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
  if (token) header.Authorization = `Bearer ${token}`;
  if (requireAuth && !token) {
    return Promise.reject({ code: 401, message: '未登录' });
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
          wx.removeStorageSync(STORAGE_KEYS.TOKEN);
          reject({ code: 401, message: '登录已过期', raw: res });
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

module.exports = {
  request,
  get: (url, query, opts = {}) => request({ url, method: 'GET', query, ...opts }),
  post: (url, data, opts = {}) => request({ url, method: 'POST', data, ...opts }),
  put: (url, data, opts = {}) => request({ url, method: 'PUT', data, ...opts }),
  del: (url, query, opts = {}) => request({ url, method: 'DELETE', query, ...opts }),
};
