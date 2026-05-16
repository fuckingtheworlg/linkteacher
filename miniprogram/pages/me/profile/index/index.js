const { meApi } = require('../../../../utils/api');
const { fmtPrice } = require('../../../../utils/format');
const { pickAndUploadImage } = require('../../../../utils/upload');

Page({
  data: {
    teacher: null,
    user: null,
    loading: false,
    canSubmit: false,
    saving: false,
  },

  onShow() {
    this.fetch();
  },

  async fetch() {
    this.setData({ loading: true });
    try {
      const teacher = await meApi.get();
      const user = (teacher && teacher.user) || null;
      this.setData({
        teacher,
        user,
        loading: false,
        canSubmit: this.checkCanSubmit(teacher),
        hourlyRateText: teacher && teacher.hourlyRate ? fmtPrice(teacher.hourlyRate) : '0',
        trialRateText: teacher && teacher.trialRate ? fmtPrice(teacher.trialRate) : '0',
        minHoursText: teacher && teacher.minHours ? teacher.minHours : 1,
      });
    } catch (err) {
      this.setData({ teacher: null, user: null, loading: false });
      console.error('[profile] fetch failed', err);
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  checkCanSubmit(t) {
    if (!t) return false;
    return !!t.hourlyRate && !!t.trialRate && (t.educations || []).length > 0 && (t.subjects || []).length > 0;
  },

  async onPickAvatar() {
    try {
      const data = await pickAndUploadImage();
      await meApi.save({ avatarUrl: data.url });
      wx.showToast({ title: '头像已更新', icon: 'success' });
      this.fetch();
    } catch (err) {
      if (err && err.canceled) return;
      console.error('[profile] avatar upload failed:', err);
      wx.showToast({ title: (err && err.message) || '上传失败', icon: 'none' });
    }
  },

  goEdit(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;

    if (field === 'subjects-1' || field === 'subjects-2') {
      wx.navigateTo({ url: `/pages/me/profile/subjects/subjects?slot=${field}` });
      return;
    }
    if (field === 'education-1' || field === 'education-2') {
      const sort = field === 'education-1' ? 0 : 1;
      wx.navigateTo({ url: `/pages/me/profile/education/education?sort=${sort}` });
      return;
    }
    if (field === 'identity') {
      wx.navigateTo({ url: '/pages/me/profile/identity/identity' });
      return;
    }
    wx.navigateTo({ url: `/pages/me/profile/edit/edit?field=${field}` });
  },

  goHome() {
    wx.switchTab({ url: '/pages/teachers/index/index' });
  },
  goBack() {
    wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/me/index/index' }) });
  },

  async onSubmit() {
    if (this.data.saving) return;
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请先完整填写所有必填项', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await meApi.submit();
      wx.showToast({ title: '已提交审核', icon: 'success' });
      this.fetch();
    } catch (err) {
      console.error('[profile.submit] failed', err);
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

});
