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
    // 提交前本地预校验：列出所有缺失项 + 提供「去填写」快速跳转
    const t = this.data.teacher;
    const missing = [];
    if (!t || !t.realName) missing.push({ label: '真实姓名', target: 'identity' });
    if (!t || !t.idCardFrontUrl) missing.push({ label: '身份证正面', target: 'identity' });
    if (!t || !t.idCardBackUrl) missing.push({ label: '身份证反面', target: 'identity' });
    if (!t || !t.addressDetail) missing.push({ label: '地址定位', target: 'identity' });
    if (!t || !t.hourlyRate) missing.push({ label: '课时费', target: 'hourlyRate' });
    if (!t || !t.trialRate) missing.push({ label: '试听价', target: 'trialRate' });
    if (!t || !t.educations || t.educations.length === 0) missing.push({ label: '至少 1 段学历背景', target: 'education-1' });
    if (!t || !t.subjects || t.subjects.length === 0) missing.push({ label: '至少 1 个辅导科目', target: 'subjects-1' });

    if (missing.length > 0) {
      const labels = missing.map((m) => m.label).join('、');
      // 跳到第一个缺失项
      const first = missing[0];
      wx.showModal({
        title: '资料不完整',
        content: `还需要填写：${labels}\n\n要先去填「${first.label}」吗？`,
        confirmText: '前往填写',
        cancelText: '我再看看',
        success: (res) => {
          if (res.confirm) this.goEdit({ currentTarget: { dataset: { field: first.target } } });
        },
      });
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
