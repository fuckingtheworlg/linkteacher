const { articlesApi } = require('../../utils/api');
const { appShare, timelineShare } = require('../../utils/share');

Page({
  data: {
    slug: '',
    article: null,
    loading: true,
    paragraphs: [],   // 拆分后的段落数组（小程序 wxml 不支持复杂渲染）
  },

  onShareAppMessage() {
    const a = this.data.article;
    const slug = this.data.slug;
    if (a && slug) {
      return appShare(`${a.title} - LinkTeacher`, `/pages/article/article?slug=${slug}`);
    }
    return appShare();
  },
  onShareTimeline() {
    const a = this.data.article;
    if (a) return timelineShare(`${a.title} - LinkTeacher`);
    return timelineShare();
  },

  async onLoad(options) {
    const slug = options.slug;
    this.setData({ slug });
    if (!slug) {
      wx.showToast({ title: '参数缺失', icon: 'none' });
      return;
    }
    try {
      const a = await articlesApi.bySlug(slug);
      const paragraphs = (a.content || '').split('\n').map((line) => line.trim());
      this.setData({ article: a, paragraphs, loading: false });
      wx.setNavigationBarTitle({ title: a.title || '详情' });
    } catch (err) {
      console.error('[article] fetch failed', err);
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },
});
