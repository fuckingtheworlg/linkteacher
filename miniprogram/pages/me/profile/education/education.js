const { meApi } = require('../../../../utils/api');
const { appShare, timelineShare } = require('../../../../utils/share');

const DEGREE_OPTIONS = [
  { code: 'BACHELOR', name: '本科' },
  { code: 'MASTER', name: '硕士' },
  { code: 'PHD', name: '博士' },
  { code: 'OTHER', name: '其他' },
];

Page({
  data: {
    sort: 0,
    degreeOptions: DEGREE_OPTIONS,
    universityId: 0,
    universityName: '',
    customUniversityName: '',   // 手动填写的校名（与 universityId 二选一）
    degree: 'BACHELOR',
    major: '',
    startYear: '',
    endYear: '',
    saving: false,
  },

  onShareAppMessage() { return appShare(); },
  onShareTimeline() { return timelineShare(); },

  async onLoad(options) {
    const sort = parseInt(options.sort || '0', 10);
    this.setData({ sort });

    try {
      const teacher = await meApi.get();
      const list = ((teacher && teacher.educations) || []).slice().sort((a, b) => a.sort - b.sort);
      const current = list[sort];
      if (current) {
        this.setData({
          universityId: current.universityId || 0,
          universityName: (current.university && current.university.nameZh) || '',
          customUniversityName: current.customUniversityName || '',
          degree: current.degree,
          major: current.major,
          startYear: current.startYear || '',
          endYear: current.endYear || '',
        });
      }
      this._otherEducations = list.filter((_, idx) => idx !== sort);
    } catch (err) {
      console.warn('[education] preload failed', err);
      this._otherEducations = [];
    }
  },

  // 打开独立的「选择学校」页（独立页面无遮罩层，彻底规避 native input 穿透）
  openUniversityPicker() {
    wx.navigateTo({
      url: '/pages/me/profile/university-picker/university-picker',
      events: {
        selectUniversity: (data) => {
          if (data.universityId) {
            this.setData({
              universityId: data.universityId,
              universityName: data.universityName,
              customUniversityName: '',
            });
          } else {
            this.setData({
              universityId: 0,
              universityName: data.universityName,
              customUniversityName: data.customUniversityName,
            });
          }
        },
      },
    });
  },

  pickDegree(e) {
    this.setData({ degree: e.currentTarget.dataset.code });
  },

  onMajorInput(e) { this.setData({ major: e.detail.value }); },
  onStartInput(e) { this.setData({ startYear: e.detail.value }); },
  onEndInput(e) { this.setData({ endYear: e.detail.value }); },

  async onSave() {
    if (this.data.saving) return;
    if (!this.data.universityId && !this.data.customUniversityName) {
      wx.showToast({ title: '请选择或手动输入学校', icon: 'none' });
      return;
    }
    if (!this.data.major) {
      wx.showToast({ title: '请填写专业', icon: 'none' });
      return;
    }
    const newItem = {
      universityId: this.data.universityId || undefined,
      customUniversityName: this.data.universityId ? undefined : this.data.customUniversityName,
      degree: this.data.degree,
      major: this.data.major,
      startYear: this.data.startYear ? Number(this.data.startYear) : undefined,
      endYear: this.data.endYear ? Number(this.data.endYear) : undefined,
      sort: this.data.sort,
    };
    const others = (this._otherEducations || []).map((e) => ({
      universityId: e.universityId || undefined,
      customUniversityName: e.universityId ? undefined : (e.customUniversityName || undefined),
      degree: e.degree,
      major: e.major,
      startYear: e.startYear,
      endYear: e.endYear,
      sort: e.sort,
    }));
    const educations = [...others, newItem].sort((a, b) => a.sort - b.sort);

    this.setData({ saving: true });
    try {
      await meApi.save({ educations });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (err) {
      console.error('[education.save] failed', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
