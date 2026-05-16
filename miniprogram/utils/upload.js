const { API_BASE, STORAGE_KEYS } = require('./config');

/**
 * 选择并上传一张图片到 /api/upload/image，统一封装。
 * 返回 Promise<{ url, filename, size }>
 * 取消时 reject 带 { canceled: true } 标识，调用方自行忽略。
 */
function pickAndUploadImage(options = {}) {
  const {
    sourceType = ['album', 'camera'],
    sizeType = ['compressed'],
    endpoint = '/upload/image',
  } = options;

  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType,
      sizeType,
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return reject(new Error('未选择文件'));
        const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
        wx.showLoading({ title: '上传中…', mask: true });
        wx.uploadFile({
          url: `${API_BASE}${endpoint}`,
          filePath: file.tempFilePath,
          name: 'file',
          header: token ? { Authorization: `Bearer ${token}` } : {},
          success: (uploadRes) => {
            wx.hideLoading();
            if (uploadRes.statusCode < 200 || uploadRes.statusCode >= 300) {
              console.error('[upload] non-2xx:', uploadRes);
              return reject(new Error(`上传失败 (${uploadRes.statusCode})`));
            }
            let body;
            try { body = JSON.parse(uploadRes.data); } catch { body = uploadRes.data; }
            const data = (body && body.code === 0 && body.data) || body;
            if (!data || !data.url) {
              console.error('[upload] invalid body:', body);
              return reject(new Error('上传响应异常'));
            }
            resolve(data);
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('[upload] uploadFile fail:', err);
            reject(new Error(err.errMsg || '网络异常'));
          },
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') >= 0) {
          return reject({ canceled: true });
        }
        console.error('[upload] chooseMedia fail:', err);
        reject(new Error('选择失败'));
      },
    });
  });
}

module.exports = { pickAndUploadImage };
