const { ensureLogin } = require('./utils/auth');

App({
  globalData: {
    userInfo: null,
    role: 'STUDENT',
    token: '',
  },
  onLaunch() {
    ensureLogin().catch((err) => {
      console.error('[app.onLaunch] login failed:', err);
    });
  },
});
