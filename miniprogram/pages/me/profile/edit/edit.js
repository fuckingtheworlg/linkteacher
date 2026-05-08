const { meApi } = require('../../../../utils/api');

const FIELD_META = {
  nickname:        { title: '昵称', type: 'input',    placeholder: '请输入昵称', max: 32, target: 'nickname' },
  mbti:            { title: 'MBTI', type: 'mbti',     placeholder: '请选择 MBTI', target: 'mbti' },
  address:         { title: '地址', type: 'input',    placeholder: '例：英国 伯明翰市', max: 64, target: 'address' },
  trialRate:       { title: '试听价 (¥/h)', type: 'number', placeholder: '请输入数字', target: 'trialRate' },
  hourlyRate:      { title: '课时费 (¥/h)', type: 'number', placeholder: '请输入数字', target: 'hourlyRate' },
  minHours:        { title: '起报小时数', type: 'integer', placeholder: '默认 1', target: 'minHours' },
  languages:       { title: '授课语言', type: 'tags', placeholder: '中文 / 英文 / 中英双语', target: 'languages' },
  teachingYears:   { title: '教龄（年）', type: 'integer', placeholder: '请输入数字', target: 'teachingYears' },
  mentorExperience:{ title: '指导经验', type: 'textarea', placeholder: '请填写指导经验描述', max: 500, target: 'mentorExperience' },
  tags:            { title: '我的标签', type: 'tags',  placeholder: '示例：05后老师 / INTJ', target: 'tags' },
  workHistory:     { title: '工作履历', type: 'textarea', placeholder: '请填写工作履历', max: 800, target: 'workHistory' },
  honors:          { title: '个人荣誉', type: 'textarea', placeholder: '请填写个人荣誉', max: 800, target: 'honors' },
  headlines:       { title: '主页要点', type: 'lines', placeholder: '每行一条，例：放榜前被伯明翰大学录取', target: 'headlines' },
};

const MBTI_OPTIONS = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP',
];

Page({
  data: {
    field: '',
    meta: null,
    mbtiOptions: MBTI_OPTIONS,
    valueText: '',
    valueArr: [],
    saving: false,
  },

  async onLoad(options) {
    const field = options.field;
    const meta = FIELD_META[field];
    if (!meta) {
      wx.showToast({ title: '未知字段', icon: 'none' });
      wx.navigateBack();
      return;
    }
    wx.setNavigationBarTitle({ title: meta.title });

    let teacher;
    try {
      teacher = await meApi.get();
    } catch (err) {
      console.warn('[edit] preload me failed', err);
    }

    let valueText = '';
    let valueArr = [];
    if (teacher) {
      const user = teacher.user || {};
      const all = { ...teacher, ...user };
      const v = all[meta.target];
      if (Array.isArray(v)) {
        valueArr = v;
        valueText = v.join('\n');
      } else if (v !== undefined && v !== null) {
        valueText = String(v);
      }
    }
    this.setData({ field, meta, valueText, valueArr });
  },

  onInput(e) {
    this.setData({ valueText: e.detail.value });
  },
  onMbtiPick(e) {
    this.setData({ valueText: e.currentTarget.dataset.value });
  },

  async onSave() {
    if (this.data.saving) return;
    const { meta, valueText } = this.data;
    let payload = {};

    if (meta.type === 'tags' || meta.type === 'lines') {
      const arr = valueText
        .split(/[\n,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      payload[meta.target] = arr;
    } else if (meta.type === 'number') {
      const n = Number(valueText);
      if (Number.isNaN(n) || n < 0) {
        wx.showToast({ title: '请输入有效金额', icon: 'none' });
        return;
      }
      payload[meta.target] = Math.round(n * 100) / 100;
    } else if (meta.type === 'integer') {
      const n = parseInt(valueText, 10);
      if (Number.isNaN(n) || n < 0) {
        wx.showToast({ title: '请输入正整数', icon: 'none' });
        return;
      }
      payload[meta.target] = n;
    } else {
      payload[meta.target] = valueText;
    }

    this.setData({ saving: true });
    try {
      await meApi.save(payload);
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (err) {
      console.error('[edit] save failed', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
