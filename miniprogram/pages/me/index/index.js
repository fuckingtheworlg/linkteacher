const { meApi, bannersApi } = require('../../../utils/api');
const { ensureLogin } = require('../../../utils/auth');
const { STORAGE_KEYS } = require('../../../utils/config');

const STATUS_TEXT = {
  DRAFT: '草稿',
  PENDING: '审核中',
  APPROVED: '已上架',
  REJECTED: '已驳回',
  OFFLINE: '已下架',
};

const APP_VERSION = '1.0.0';

Page({
  data: {
    user: null,
    teacher: null,
    statusText: '',
    rejectReason: '',
    aboutUsBanner: null,
    favoriteTeacherCount: 0,
    favoriteCompetitionCount: 0,
    appVersion: APP_VERSION,
    grid: [
      { key: 'partnership', label: '合作规则', icon: 'i' },
      { key: 'mypage', label: '我的页面', icon: '⊘' },
      { key: 'reviews', label: '学生评价', icon: 'T' },
      { key: 'invite', label: '邀请老师', icon: '👥' },
      { key: 'resume', label: '简历管理', icon: '📄' },
      { key: 'demo', label: 'Demo管理', icon: '▶' },
      { key: 'whiteboard', label: '板书管理', icon: 'T' },
      { key: 'cases', label: '案例管理', icon: '◫' },
    ],
  },

  async onShow() {
    try {
      await ensureLogin();
      const user = wx.getStorageSync(STORAGE_KEYS.USER) || null;
      this.setData({ user });
    } catch (err) {
      console.error('[me] login failed:', err);
    }

    try {
      const teacher = await meApi.get();
      const status = teacher && teacher.status;
      this.setData({
        teacher,
        statusText: STATUS_TEXT[status] || '',
        rejectReason: (teacher && teacher.rejectReason) || '',
      });
    } catch (err) {
      console.warn('[me] fetch teacher me failed (可忽略，学生身份):', err);
      this.setData({ teacher: null, statusText: '', rejectReason: '' });
    }

    try {
      const list = await bannersApi.list('ABOUT_US');
      this.setData({ aboutUsBanner: list && list[0] ? list[0] : null });
    } catch (err) {
      console.warn('[me] fetch about-us banner failed:', err);
    }
  },

  // ============ 跳转处理 ============
  onEditProfile() {
    wx.navigateTo({ url: '/pages/me/profile/index/index' });
  },

  onAboutTap() {
    wx.navigateTo({ url: '/pages/article/article?slug=about-us' });
  },

  onFavTeacher() {
    wx.showToast({ title: '收藏功能即将上线', icon: 'none' });
  },
  onFavCompetition() {
    wx.showToast({ title: '竞赛收藏即将上线', icon: 'none' });
  },

  onGridTap(e) {
    const key = e.currentTarget.dataset.key;
    switch (key) {
      case 'partnership':
        wx.navigateTo({ url: '/pages/article/article?slug=partnership-rules' });
        break;
      case 'mypage':
        this.gotoMyPage();
        break;
      case 'invite':
        wx.navigateTo({ url: '/pages/me/invite/invite' });
        break;
      case 'resume':
        wx.navigateTo({ url: '/pages/me/profile/resume/resume' });
        break;
      case 'reviews':
      case 'demo':
      case 'whiteboard':
      case 'cases':
        wx.showToast({ title: '功能开发中，敬请期待', icon: 'none' });
        break;
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  gotoMyPage() {
    const t = this.data.teacher;
    if (t && t.status === 'APPROVED') {
      wx.navigateTo({ url: `/pages/teachers/detail/detail?id=${t.id}` });
    } else if (t) {
      wx.showToast({ title: `当前状态：${this.data.statusText}，通过审核后可预览`, icon: 'none' });
    } else {
      wx.showModal({
        title: '尚未成为导师',
        content: '前往「编辑个人资料」完善信息后提交审核，审核通过即可对外展示。',
        confirmText: '去填写',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/me/profile/index/index' });
        },
      });
    }
  },

  // 微信"分享给朋友"按钮触发，作为「邀请老师」的简化实现
  onShareAppMessage() {
    return {
      title: 'UniClass 直连全球优秀独立老师，了解一下？',
      path: '/pages/teachers/index/index',
    };
  },
  onShareTimeline() {
    return {
      title: 'UniClass 直连全球优秀独立老师',
    };
  },
});
