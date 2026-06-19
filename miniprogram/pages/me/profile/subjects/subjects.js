const { meApi, dictApi } = require('../../../../utils/api');
const { appShare, timelineShare } = require('../../../../utils/share');

Page({
  data: {
    slot: 'subjects-1',
    slotIndex: 0,
    subjects: [],
    curriculums: [],
    selectedSubjectId: 0,
    selectedCurriculumIds: [],
    note: '',
    saving: false,
  },

  onShareAppMessage() { return appShare(); },
  onShareTimeline() { return timelineShare(); },

  async onLoad(options) {
    const slot = options.slot || 'subjects-1';
    const slotIndex = slot === 'subjects-2' ? 1 : 0;
    this.setData({ slot, slotIndex });

    try {
      const [subjects, curriculums] = await Promise.all([dictApi.subjects(), dictApi.curriculums()]);
      this.setData({ subjects, curriculums: this.markCurriculums(curriculums, []) });

      const teacher = await meApi.get();
      const list = (teacher && teacher.subjects) || [];
      const current = list[slotIndex];
      if (current) {
        const ids = (current.curriculums || []).map((c) => c.curriculumId);
        this.setData({
          selectedSubjectId: current.subjectId,
          selectedCurriculumIds: ids,
          curriculums: this.markCurriculums(curriculums, ids),
          note: current.note || '',
        });
      }
      this._otherSubjects = list.filter((_, idx) => idx !== slotIndex);
    } catch (err) {
      console.error('[subjects] preload failed', err);
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      this._otherSubjects = [];
    }
  },

  pickSubject(e) {
    this.setData({ selectedSubjectId: Number(e.currentTarget.dataset.id) });
  },
  toggleCurriculum(e) {
    const id = Number(e.currentTarget.dataset.id);
    const set = new Set(this.data.selectedCurriculumIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const ids = [...set];
    this.setData({
      selectedCurriculumIds: ids,
      curriculums: this.markCurriculums(this.data.curriculums, ids),
    });
  },

  markCurriculums(list, selectedIds) {
    const set = new Set(selectedIds);
    return (list || []).map((c) => ({ ...c, _selected: set.has(c.id) }));
  },
  onNoteInput(e) { this.setData({ note: e.detail.value }); },

  async onSave() {
    if (this.data.saving) return;
    if (!this.data.selectedSubjectId) {
      wx.showToast({ title: '请选择科目', icon: 'none' });
      return;
    }
    if (this.data.selectedCurriculumIds.length === 0) {
      wx.showToast({ title: '请至少选择 1 个课程体系', icon: 'none' });
      return;
    }

    const others = (this._otherSubjects || []).map((s) => ({
      subjectId: s.subjectId,
      curriculumIds: (s.curriculums || []).map((c) => c.curriculumId),
      note: s.note || '',
    }));

    // 同一科目不能在两栏重复选
    if (others.some((s) => s.subjectId === this.data.selectedSubjectId)) {
      wx.showToast({ title: '该科目已在另一栏选择，请选不同科目', icon: 'none' });
      return;
    }

    const newItem = {
      subjectId: this.data.selectedSubjectId,
      curriculumIds: this.data.selectedCurriculumIds,
      note: this.data.note,
    };
    const subjects = this.data.slotIndex === 0 ? [newItem, ...others] : [...others, newItem];

    this.setData({ saving: true });
    try {
      await meApi.save({ subjects });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (err) {
      console.error('[subjects.save] failed', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
