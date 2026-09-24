const { meApi } = require('../../../../utils/api');
const { appShare, timelineShare } = require('../../../../utils/share');

const FIELD_META = {
  nickname:        { title: '昵称', type: 'input',    placeholder: '请输入昵称', max: 32, target: 'nickname' },
  mbti:            { title: 'MBTI', type: 'mbti',     placeholder: '请选择 MBTI', target: 'mbti' },
  address:         { title: '地址', type: 'input',    placeholder: '例：英国 伯明翰市', max: 64, target: 'address' },
  trialRate:       { title: '试听价 (¥/h)', type: 'number', placeholder: '请输入数字', target: 'trialRate', maxValue: 99999, maxlen: 6 },
  hourlyRate:      { title: '课时费 (¥/h)', type: 'number', placeholder: '请输入数字', target: 'hourlyRate', maxValue: 99999, maxlen: 6 },
  minHours:        { title: '起报小时数', type: 'integer', placeholder: '默认 1', target: 'minHours', maxValue: 24, maxlen: 2 },
  languages:       { title: '授课语言', type: 'tags', placeholder: '中英双语授课 / 纯英授课（可多选，每行一个）', target: 'languages' },
  teachingYears:   { title: '教龄（年）', type: 'integer', placeholder: '请输入数字', target: 'teachingYears', maxValue: 80, maxlen: 2 },
  mentorExperience:{ title: '指导经验与成果', type: 'textarea', placeholder: '请填写指导经验与成果', max: 500, target: 'mentorExperience' },
  tags:            { title: '我的标签', type: 'tags',  placeholder: '代际标签单选，例：05后老师 / 在校学生', target: 'tags', single: true },
  honors:          { title: '个人荣誉', type: 'textarea', placeholder: '请填写个人荣誉', max: 800, target: 'honors' },
  headlines:       { title: '我的简介', type: 'lines', placeholder: '每行一条，可用标点；回车换行', target: 'headlines', splitByNewlineOnly: true },
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

  onShareAppMessage() { return appShare(); },
  onShareTimeline() { return timelineShare(); },

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
    this._val = valueText;
    this.setData({ field, meta, valueText, valueArr });
  },

  // 受控输入：setData 回写保证输入框稳定回显（数字/英文无 IME 问题）
  // textarea 多行中文也正常；同时存 _val 供保存使用
  onInput(e) {
    this._val = e.detail.value;
    this.setData({ valueText: e.detail.value });
  },
  onMbtiPick(e) {
    const v = e.currentTarget.dataset.value;
    this._val = v;
    this.setData({ valueText: v });
  },

  async onSave() {
    if (this.data.saving) return;
    const { meta } = this.data;
    const valueText = this._val != null ? this._val : this.data.valueText;
    let payload = {};

    if (meta.type === 'tags' || meta.type === 'lines') {
      const splitter = meta.splitByNewlineOnly ? /\n/ : /[\n,，]/;
      let arr = valueText
        .split(splitter)
        .map((s) => s.trim())
        .filter(Boolean);
      if (meta.single && arr.length > 1) {
        wx.showToast({ title: '标签只能选一个', icon: 'none' });
        return;
      }
      if (meta.maxLines != null && arr.length > meta.maxLines) {
        wx.showToast({ title: `最多 ${meta.maxLines} 条`, icon: 'none' });
        return;
      }
      if (meta.maxLen != null) {
        const over = arr.find((s) => s.length > meta.maxLen);
        if (over) {
          wx.showToast({ title: `每条不超过 ${meta.maxLen} 字`, icon: 'none' });
          return;
        }
      }
      if (meta.single) arr = arr.slice(0, 1);
      payload[meta.target] = arr;
    } else if (meta.type === 'number') {
      const n = Number(valueText);
      if (Number.isNaN(n) || n < 0) {
        wx.showToast({ title: '请输入有效金额', icon: 'none' });
        return;
      }
      if (meta.maxValue != null && n > meta.maxValue) {
        wx.showToast({ title: `不能超过 ${meta.maxValue}`, icon: 'none' });
        return;
      }
      payload[meta.target] = Math.round(n * 100) / 100;
    } else if (meta.type === 'integer') {
      const n = parseInt(valueText, 10);
      if (Number.isNaN(n) || n < 0) {
        wx.showToast({ title: '请输入正整数', icon: 'none' });
        return;
      }
      if (meta.maxValue != null && n > meta.maxValue) {
        wx.showToast({ title: `不能超过 ${meta.maxValue}`, icon: 'none' });
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
