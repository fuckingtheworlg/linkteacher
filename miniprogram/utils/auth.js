const { post } = require('./request');
const { STORAGE_KEYS } = require('./config');

let loginPromise = null;

function ensureLogin() {
  const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
  if (token) return Promise.resolve(token);
  if (loginPromise) return loginPromise;

  loginPromise = new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        if (!res.code) return reject(new Error('wx.login 未返回 code'));
        try {
          const data = await post('/wx/login', { code: res.code });
          if (data && data.token) {
            wx.setStorageSync(STORAGE_KEYS.TOKEN, data.token);
            if (data.user) wx.setStorageSync(STORAGE_KEYS.USER, data.user);
            const app = getApp();
            if (app) {
              app.globalData.token = data.token;
              app.globalData.userInfo = data.user || null;
              app.globalData.role = (data.user && data.user.role) || 'STUDENT';
            }
            resolve(data.token);
          } else {
            reject(new Error('后端未返回 token'));
          }
        } catch (err) {
          reject(err);
        } finally {
          loginPromise = null;
        }
      },
      fail: (err) => {
        loginPromise = null;
        reject(err);
      },
    });
  });

  return loginPromise;
}

function getCachedUser() {
  return wx.getStorageSync(STORAGE_KEYS.USER) || null;
}

function logout() {
  wx.removeStorageSync(STORAGE_KEYS.TOKEN);
  wx.removeStorageSync(STORAGE_KEYS.USER);
}

module.exports = { ensureLogin, getCachedUser, logout };
