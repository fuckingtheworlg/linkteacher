const { meApi, bannersApi, configApi } = require('../../../utils/api');
const { ensureLogin } = require('../../../utils/auth');
const { STORAGE_KEYS } = require('../../../utils/config');
const { pickAndUploadImage } = require('../../../utils/upload');

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
    oa: null,    // 公众号配置（来自后台 SystemConfig key=official-account）
    grid: [
      { key: 'partnership', label: '合作规则', icon: '/assets/grid/grid-partnership.png' },
      { key: 'mypage',      label: '我的页面', icon: '/assets/grid/grid-mypage.png' },
      { key: 'reviews',     label: '学生评价', icon: '/assets/grid/grid-reviews.png' },
      { key: 'invite',      label: '邀请老师', icon: '/assets/grid/grid-invite.png' },
      { key: 'resume',      label: '简历管理', icon: '/assets/grid/grid-resume.png' },
      { key: 'demo',        label: 'Demo 管理', icon: '/assets/grid/grid-demo.png' },
      { key: 'whiteboard',  label: '板书管理', icon: '/assets/grid/grid-whiteboard.png' },
      { key: 'cases',       label: '案例管理', icon: '/assets/grid/grid-cases.png' },
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

    try {
      const cfg = await configApi.get('official-account');
      if (cfg && cfg.exists && cfg.value) {
        const parsed = JSON.parse(cfg.value);
        if (parsed.active !== false) {
          this.setData({ oa: parsed });
        } else {
          this.setData({ oa: null });
        }
      }
    } catch (err) {
      console.warn('[me] fetch oa config failed:', err);
    }
  },

  previewOaQrcode() {
    if (this.data.oa && this.data.oa.qrcodeUrl) {
      wx.previewImage({ urls: [this.data.oa.qrcodeUrl] });
    }
  },

  // ============ 跳转处理 ============
  onEditProfile() {
    wx.navigateTo({ url: '/pages/me/profile/index/index' });
  },

  async onPickAvatar() {
    try {
      const data = await pickAndUploadImage();
      await meApi.save({ avatarUrl: data.url });
      const cached = wx.getStorageSync(STORAGE_KEYS.USER) || {};
      const next = { ...cached, avatarUrl: data.url };
      wx.setStorageSync(STORAGE_KEYS.USER, next);
      this.setData({ user: next });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    } catch (err) {
      if (err && err.canceled) return;
      console.error('[me] avatar upload failed:', err);
      wx.showToast({ title: (err && err.message) || '上传失败', icon: 'none' });
    }
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
    if (t) {
      // 预览模式：调用 me 接口拉数据，无视审核状态，本人随时可看
      wx.navigateTo({ url: `/pages/teachers/detail/detail?preview=1&id=${t.id}` });
    } else {
      wx.showModal({
        title: '尚未填写资料',
        content: '前往「编辑个人资料」完善信息后即可在此预览自己的展示页。',
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
      title: 'LinkTeacher 直连全球优秀独立老师，了解一下？',
      path: '/pages/teachers/index/index',
    };
  },
  onShareTimeline() {
    return {
      title: 'LinkTeacher 直连全球优秀独立老师',
    };
  },
});
