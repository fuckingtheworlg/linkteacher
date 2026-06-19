const { teachersApi, matchApi, meApi } = require('../../../utils/api');
const { fmtPrice, genderToText } = require('../../../utils/format');
const { appShare, timelineShare } = require('../../../utils/share');

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
    isPreview: false,         // 本人预览模式
    statusText: '',           // 预览模式下顶部状态横幅
  },

  async onLoad(options) {
    const isPreview = options.preview === '1' || options.preview === 'me';
    this.setData({ teacherId: options.id || null, isPreview });
    await this.fetch(options.id, isPreview);
  },

  async fetch(id, isPreview) {
    this.setData({ loading: true });
    try {
      // 预览模式调 me 接口（无视审核状态）；公共模式走 /teachers/:id（仅 APPROVED）
      const t = isPreview ? await meApi.get() : await teachersApi.detail(id);
      if (!t) {
        wx.showToast({ title: '请先填写并保存导师资料', icon: 'none' });
        wx.navigateBack({ delta: 1, fail: () => {} });
        return;
      }
      const headlines = Array.isArray(t.headlines) ? t.headlines : [];
      const languages = Array.isArray(t.languages) ? t.languages : [];
      const tags = Array.isArray(t.tags) ? t.tags : [];

      const educationsView = (t.educations || []).map((e) => {
        const nameZh = (e.university ? e.university.nameZh : '') || e.customUniversityName || '';
        const nameEn = e.university ? e.university.nameEn : '';
        return {
          id: e.id,
          qsLabel: e.university && e.university.qsRank ? `${e.university.qsYear || 2025}QS  #${e.university.qsRank}` : '',
          nameEn,
          nameZh,
          major: e.major,
          degreeText: this.degreeText(e.degree),
          logoUrl: (e.university && e.university.logoUrl) || '',
          // logo 缺失时用学校英文首字母作占位（如 'Stanford' → 'S'）
          logoLetter: (nameEn || nameZh).charAt(0).toUpperCase(),
          // 学历认证状态：VERIFIED 显绿勾 / REJECTED 显红叉 / PENDING 显橙叹号
          verifiedStatus: e.verifiedStatus || 'PENDING',
        };
      });

      const subjectsView = (t.subjects || []).map((ts) => ({
        name: ts.subject.name,
        code: ts.subject.code,
        // 课程体系已合并为 iGCSE / A-Level / IB / AP / 竞赛，直接列出名称
        curriculumNames: (ts.curriculums || []).map((c) => c.curriculum.name).join('、'),
      }));

      const STATUS_TEXT = {
        DRAFT: '草稿（未提交审核）',
        PENDING: '审核中（学生暂时看不到）',
        APPROVED: '已上架（外部可见）',
        REJECTED: '已驳回',
        OFFLINE: '已下架',
      };

      const nickname = (t.user && t.user.nickname) || '老师';
      this.setData({
        teacher: t,
        nickname,
        avatarLetter: nickname.charAt(0).toUpperCase(),
        headlines,
        languagesText: languages.join('，'),
        tagsList: tags,
        educationsView,
        subjectsView,
        hourlyRateText: fmtPrice(t.hourlyRate),
        trialRateText: fmtPrice(t.trialRate),
        statusText: isPreview ? (STATUS_TEXT[t.status] || '') : '',
        loading: false,
      });
      wx.setNavigationBarTitle({
        title: isPreview ? '预览·我的页面' : ((t.user && t.user.nickname) || '老师详情'),
      });
    } catch (err) {
      console.error('[teacher.detail] fetch failed', err);
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  degreeText(d) {
    return ({ BACHELOR: '本科', MASTER: '硕士', PHD: '博士' })[d] || '其他';
  },

  toggleFav() {
    this.setData({ favorited: !this.data.favorited });
    // 收藏接口在 Phase 4+ 视情况补；当前仅本地状态
  },

  onContact() {
    matchApi.log('teacher_detail_contact', this.data.teacherId).catch(() => {});
  },

  goEditProfile() {
    wx.redirectTo({ url: '/pages/me/profile/index/index' });
  },

  onShareAppMessage() {
    const t = this.data.teacher;
    if (t && t.id && !this.data.isPreview) {
      const name = (t.user && t.user.nickname) || '一位老师';
      return appShare(`向你推荐：${name} - LinkTeacher`, `/pages/teachers/detail/detail?id=${t.id}`);
    }
    return appShare();
  },
  onShareTimeline() {
    const t = this.data.teacher;
    if (t && t.id && !this.data.isPreview) {
      const name = (t.user && t.user.nickname) || '一位老师';
      return timelineShare(`向你推荐：${name} - LinkTeacher`);
    }
    return timelineShare();
  },

  genderText() {
    return genderToText(this.data.teacher && this.data.teacher.gender);
  },
});
