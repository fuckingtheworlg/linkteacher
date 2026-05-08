const { meApi, dictApi } = require('../../../../utils/api');

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
    universities: [],
    universityKeyword: '',
    universityId: 0,
    universityName: '',
    degree: 'BACHELOR',
    major: '',
    startYear: '',
    endYear: '',
    saving: false,
    showUniversityPicker: false,
  },

  async onLoad(options) {
    const sort = parseInt(options.sort || '0', 10);
    this.setData({ sort });

    try {
      const teacher = await meApi.get();
      const list = ((teacher && teacher.educations) || []).slice().sort((a, b) => a.sort - b.sort);
      const current = list[sort];
      if (current) {
        this.setData({
          universityId: current.universityId,
          universityName: current.university && current.university.nameZh,
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

  async openUniversityPicker() {
    if (this.data.universities.length === 0) {
      try {
        const list = await dictApi.universities({});
        this.setData({ universities: list });
      } catch (err) {
        wx.showToast({ title: err.message || '加载大学失败', icon: 'none' });
        return;
      }
    }
    this.setData({ showUniversityPicker: true });
  },
  closeUniversityPicker() {
    this.setData({ showUniversityPicker: false });
  },
  async onUniversitySearch(e) {
    const k = e.detail.value;
    this.setData({ universityKeyword: k });
    try {
      const list = await dictApi.universities({ keyword: k });
      this.setData({ universities: list });
    } catch (err) {
      console.warn('search universities fail', err);
    }
  },
  pickUniversity(e) {
    const id = Number(e.currentTarget.dataset.id);
    const u = this.data.universities.find((x) => x.id === id);
    if (u) {
      this.setData({
        universityId: u.id,
        universityName: `${u.nameZh}（${u.nameEn}）`,
        showUniversityPicker: false,
      });
    }
  },

  pickDegree(e) {
    this.setData({ degree: e.currentTarget.dataset.code });
  },

  onMajorInput(e) { this.setData({ major: e.detail.value }); },
  onStartInput(e) { this.setData({ startYear: e.detail.value }); },
  onEndInput(e) { this.setData({ endYear: e.detail.value }); },

  async onSave() {
    if (this.data.saving) return;
    if (!this.data.universityId) {
      wx.showToast({ title: '请选择大学', icon: 'none' });
      return;
    }
    if (!this.data.major) {
      wx.showToast({ title: '请填写专业', icon: 'none' });
      return;
    }
    const newItem = {
      universityId: this.data.universityId,
      degree: this.data.degree,
      major: this.data.major,
      startYear: this.data.startYear ? Number(this.data.startYear) : undefined,
      endYear: this.data.endYear ? Number(this.data.endYear) : undefined,
      sort: this.data.sort,
    };
    const others = (this._otherEducations || []).map((e) => ({
      universityId: e.universityId,
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
