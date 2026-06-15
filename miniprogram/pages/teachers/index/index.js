const { teachersApi, dictApi, bannersApi, matchApi } = require('../../../utils/api');
const { fmtPrice, genderToText } = require('../../../utils/format');
const { appShare, timelineShare } = require('../../../utils/share');

Page({
  data: {
    keyword: '',
    banners: [],
    subjects: [],         // [{id,name,code}]
    activeSubjectId: 0,   // 0 表示「全部」
    curriculums: [],
    activeCurriculumId: 0,
    sort: 'smart',        // smart / rate-asc / rate-desc / newest
    showSortPanel: false,
    showCurriculumPanel: false,
    list: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    finished: false,
  },

  async onLoad() {
    try {
      const [subjects, curriculums, banners] = await Promise.all([
        dictApi.subjects(),
        dictApi.curriculums(),
        bannersApi.list('HOME_TOP'),
      ]);
      this.setData({ subjects, curriculums, banners });
    } catch (err) {
      console.error('[teachers/index] load dict failed:', err);
      wx.showToast({ title: err.message || '加载字典失败', icon: 'none' });
    }
    this.loadList(true);
  },

  onPullDownRefresh() {
    this.loadList(true).finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (!this.data.finished && !this.data.loading) {
      this.loadList(false);
    }
  },

  async loadList(reset) {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const { keyword, activeSubjectId, activeCurriculumId, sort } = this.data;
    const page = reset ? 1 : this.data.page + 1;
    try {
      const data = await teachersApi.list({
        keyword: keyword || undefined,
        subjectId: activeSubjectId || undefined,
        curriculumId: activeCurriculumId || undefined,
        sort,
        page,
        pageSize: this.data.pageSize,
      });
      const enriched = (data.list || []).map((t) => this.enrichItem(t));
      const merged = reset ? enriched : this.data.list.concat(enriched);
      this.setData({
        list: merged,
        page,
        total: data.total || 0,
        finished: merged.length >= (data.total || 0),
      });
    } catch (err) {
      console.error('[teachers/index] loadList failed:', err);
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  enrichItem(t) {
    const edu = (t.educations && t.educations[0]) || null;
    const major = edu ? edu.major : '';
    const eduName = edu && edu.university ? edu.university.nameZh : '';
    const subjectsView = (t.subjects || []).map((ts) => {
      const curs = (ts.curriculums || []).map((c) => c.curriculum.name).join(',');
      return {
        name: ts.subject.name,
        code: ts.subject.code,
        curriculums: curs,
      };
    });
    const headlineList = Array.isArray(t.headlines) ? t.headlines : [];
    const nickname = (t.user && t.user.nickname) || '老师';
    return {
      id: t.id,
      avatarUrl: (t.user && t.user.avatarUrl) || '',
      avatarLetter: nickname.charAt(0).toUpperCase(),
      nickname,
      genderIcon: genderToText(t.gender),
      addressLine: [t.country, t.city].filter(Boolean).join(' · '),
      isCertified: !!t.isCertified,
      hourlyRate: fmtPrice(t.hourlyRate),
      trialRate: fmtPrice(t.trialRate),
      major,
      eduLine: [eduName, major].filter(Boolean).join(' · '),
      subjectsView,
      firstHeadline: headlineList[0] || '',
      headlineSummary: headlineList.slice(0, 2).join('；'),
    };
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  onSearchConfirm() {
    this.loadList(true);
  },

  onSubjectTap(e) {
    const id = Number(e.currentTarget.dataset.id) || 0;
    if (id === this.data.activeSubjectId) return;
    this.setData({ activeSubjectId: id });
    this.loadList(true);
  },

  toggleCurriculumPanel() {
    this.setData({
      showCurriculumPanel: !this.data.showCurriculumPanel,
      showSortPanel: false,
    });
  },
  onCurriculumPick(e) {
    const id = Number(e.currentTarget.dataset.id) || 0;
    this.setData({ activeCurriculumId: id, showCurriculumPanel: false });
    this.loadList(true);
  },

  toggleSortPanel() {
    this.setData({
      showSortPanel: !this.data.showSortPanel,
      showCurriculumPanel: false,
    });
  },
  onSortPick(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ sort: value, showSortPanel: false });
    this.loadList(true);
  },

  closePanels() {
    this.setData({ showSortPanel: false, showCurriculumPanel: false });
  },

  // 空函数 — 给 wxml 的 catchtap 用，仅用于阻止事件冒泡到 page 的 closePanels
  noop() {},

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/teachers/detail/detail?id=${id}` });
  },

  onMatchContact() {
    matchApi.log('home_match_button').catch((err) => console.warn('match log fail', err));
  },

  onShareAppMessage() { return appShare(); },
  onShareTimeline() { return timelineShare(); },

  onBannerTap(e) {
    const link = e.currentTarget.dataset.link;
    if (!link) {
      // 后台未配置 link：明确提示，避免静默无反应
      wx.showToast({ title: '该入口暂未配置目标', icon: 'none' });
      return;
    }
    // 以 http(s) 开头 → 复制链接（小程序不允许直接打开外部 URL）
    // 否则视为 article slug → 跳转通用文章页
    if (/^https?:\/\//i.test(link)) {
      wx.setClipboardData({
        data: link,
        success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
      });
    } else {
      wx.navigateTo({
        url: `/pages/article/article?slug=${encodeURIComponent(link)}`,
        fail: (err) => {
          console.error('[banner] navigate fail:', err);
          wx.showToast({ title: '跳转失败', icon: 'none' });
        },
      });
    }
  },
});
