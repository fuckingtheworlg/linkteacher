const { dictApi } = require('../../../../utils/api');
const { appShare, timelineShare } = require('../../../../utils/share');

Page({
  data: {
    keyword: '',
    universities: [],
    loading: false,
  },

  onShareAppMessage() { return appShare(); },
  onShareTimeline() { return timelineShare(); },

  async onLoad() {
    await this.search('');
  },

  async search(keyword) {
    this.setData({ loading: true });
    try {
      const list = await dictApi.universities(keyword ? { keyword } : {});
      this.setData({ universities: list, loading: false });
    } catch (err) {
      console.error('[university-picker] load failed', err);
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    // 简单防抖
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.search(keyword.trim()), 300);
  },

  pickUniversity(e) {
    const id = Number(e.currentTarget.dataset.id);
    const u = this.data.universities.find((x) => x.id === id);
    if (!u) return;
    this.emitBack({
      universityId: u.id,
      universityName: `${u.nameZh}（${u.nameEn}）`,
    });
  },

  useCustomUniversity() {
    const name = (this.data.keyword || '').trim();
    if (!name) {
      wx.showToast({ title: '请先在上方输入校名', icon: 'none' });
      return;
    }
    this.emitBack({
      customUniversityName: name,
      universityName: name,
    });
  },

  emitBack(payload) {
    const ec = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (ec && ec.emit) ec.emit('selectUniversity', payload);
    wx.navigateBack();
  },
});
