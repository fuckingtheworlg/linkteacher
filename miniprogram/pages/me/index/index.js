const { meApi } = require('../../../utils/api');
const { ensureLogin, getCachedUser, logout } = require('../../../utils/auth');
const { STORAGE_KEYS } = require('../../../utils/config');

const STATUS_TEXT = {
  DRAFT: '草稿',
  PENDING: '审核中',
  APPROVED: '已上架',
  REJECTED: '已驳回',
  OFFLINE: '已下架',
};

Page({
  data: {
    user: null,
    teacher: null,
    statusText: '',
    rejectReason: '',
    loading: false,
  },

  async onShow() {
    this.setData({ loading: true });
    try {
      await ensureLogin();
      const user = wx.getStorageSync(STORAGE_KEYS.USER) || getCachedUser();
      this.setData({ user });
      // 仅当 role 是 TEACHER 才请求 me；STUDENT 也请求一遍以判断是否曾经做过导师
      try {
        const teacher = await meApi.get();
        const status = teacher && teacher.status;
        this.setData({
          teacher,
          statusText: STATUS_TEXT[status] || '',
          rejectReason: (teacher && teacher.rejectReason) || '',
        });
      } catch (err) {
        console.warn('[me] fetch teacher me failed (可忽略)', err);
        this.setData({ teacher: null, statusText: '', rejectReason: '' });
      }
    } catch (err) {
      console.error('[me] login failed:', err);
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goEditProfile() {
    wx.navigateTo({ url: '/pages/me/profile/index/index' });
  },

  becomeTeacher() {
    wx.navigateTo({ url: '/pages/me/profile/index/index' });
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
          this.setData({ user: null, teacher: null, statusText: '' });
          wx.reLaunch({ url: '/pages/teachers/index/index' });
        }
      },
    });
  },
});
