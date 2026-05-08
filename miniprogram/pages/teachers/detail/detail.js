const { teachersApi, matchApi } = require('../../../utils/api');
const { fmtPrice, genderToText } = require('../../../utils/format');

Page({
  data: {
    teacherId: null,
    loading: true,
    teacher: null,
    headlines: [],
    languagesText: '',
    tagsList: [],
    subjectsView: [],
    educationsView: [],
    favorited: false,
  },

  async onLoad(options) {
    const id = options.id;
    this.setData({ teacherId: id });
    await this.fetch(id);
  },

  async fetch(id) {
    this.setData({ loading: true });
    try {
      const t = await teachersApi.detail(id);
      const headlines = Array.isArray(t.headlines) ? t.headlines : [];
      const languages = Array.isArray(t.languages) ? t.languages : [];
      const tags = Array.isArray(t.tags) ? t.tags : [];

      const educationsView = (t.educations || []).map((e) => ({
        id: e.id,
        qsLabel: e.university && e.university.qsRank ? `${e.university.qsYear || 2025}QS  #${e.university.qsRank}` : '',
        nameEn: e.university ? e.university.nameEn : '',
        nameZh: e.university ? e.university.nameZh : '',
        major: e.major,
        degreeText: this.degreeText(e.degree),
        logoUrl: e.university && e.university.logoUrl,
      }));

      const subjectsView = (t.subjects || []).map((ts) => ({
        name: ts.subject.name,
        code: ts.subject.code,
        items: (ts.curriculums || []).map((c) => ({
          name: c.curriculum.name,
        })),
        // 详情页里把 ALevel 的多个体系合并展示：「ALevel: 爱德思,CAIE,AQA」
        alevelLine: this.buildAlevelLine(ts.curriculums || []),
        igcseLine: this.buildIgcseLine(ts.curriculums || []),
      }));

      this.setData({
        teacher: t,
        headlines,
        languagesText: languages.join('，'),
        tagsList: tags,
        educationsView,
        subjectsView,
        hourlyRateText: fmtPrice(t.hourlyRate),
        trialRateText: fmtPrice(t.trialRate),
        loading: false,
      });
      wx.setNavigationBarTitle({ title: (t.user && t.user.nickname) || '老师详情' });
    } catch (err) {
      console.error('[teacher.detail] fetch failed', err);
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  degreeText(d) {
    return ({ BACHELOR: '本科', MASTER: '硕士', PHD: '博士' })[d] || '其他';
  },

  buildAlevelLine(curs) {
    const aLevels = curs.filter((c) => c.curriculum.code.startsWith('alevel-'));
    if (!aLevels.length) return '';
    const variants = aLevels
      .map((c) => c.curriculum.name.replace('ALevel-', ''))
      .filter((s) => s !== 'ALevel');
    return `ALevel: ${variants.join(',')}`;
  },
  buildIgcseLine(curs) {
    const has = curs.some((c) => c.curriculum.code === 'igcse');
    return has ? 'iGCSE' : '';
  },

  toggleFav() {
    this.setData({ favorited: !this.data.favorited });
    // 收藏接口在 Phase 4+ 视情况补；当前仅本地状态
  },

  onContact() {
    matchApi.log('teacher_detail_contact', this.data.teacherId).catch(() => {});
  },

  genderText() {
    return genderToText(this.data.teacher && this.data.teacher.gender);
  },
});
