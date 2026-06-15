const { meApi } = require('../../../../utils/api');
const { API_BASE, STORAGE_KEYS } = require('../../../../utils/config');
const { appShare, timelineShare } = require('../../../../utils/share');

const STATUS_TEXT = {
  EMPTY: '',
  PENDING_REVIEW: '审核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
};

Page({
  data: {
    loading: true,
    saving: false,
    uploading: false,
    resumeUrl: '',
    resumeFilename: '',
    resumeUploadedAt: '',
    resumeRejectReason: '',
    resumeStatus: 'EMPTY',
    statusText: '',
    allowDisplay: false,   // 「是否同意展示」单选；默认不同意（与截图一致）
  },

  onShareAppMessage() { return appShare(); },
  onShareTimeline() { return timelineShare(); },

  async onLoad() {
    try {
      const teacher = await meApi.get();
      const status = (teacher && teacher.resumeStatus) || 'EMPTY';
      this.setData({
        loading: false,
        resumeUrl: (teacher && teacher.resumeUrl) || '',
        resumeFilename: (teacher && teacher.resumeFilename) || '',
        resumeUploadedAt: (teacher && teacher.resumeUploadedAt) || '',
        resumeRejectReason: (teacher && teacher.resumeRejectReason) || '',
        resumeStatus: status,
        statusText: STATUS_TEXT[status] || '',
        allowDisplay: !!(teacher && teacher.resumeAllowDisplay),
      });
    } catch (err) {
      console.warn('[resume] preload failed (可忽略，未成为导师):', err);
      this.setData({ loading: false });
    }
  },

  pickAllow(e) {
    const value = e.currentTarget.dataset.value === 'true';
    this.setData({ allowDisplay: value });
    // 选择后立即同步给后端，避免用户切换后忘保存
    this.syncAllowDisplay(value);
  },

  async syncAllowDisplay(value) {
    try {
      await meApi.save({ resumeAllowDisplay: value });
    } catch (err) {
      console.error('[resume] sync allowDisplay failed:', err);
      // 同步失败不强行回滚 UI，让用户重新点
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    }
  },

  // 点击 + 调起群聊文件选择
  onPickFile() {
    if (this.data.uploading) return;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf'],
      success: async (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        if (!/\.pdf$/i.test(file.name)) {
          wx.showToast({ title: '仅支持 PDF 格式', icon: 'none' });
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          wx.showToast({ title: '文件过大（>10MB）', icon: 'none' });
          return;
        }
        await this.doUpload(file);
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
        console.error('[resume] chooseMessageFile fail:', err);
        wx.showToast({ title: '选择文件失败', icon: 'none' });
      },
    });
  },

  doUpload(file) {
    this.setData({ uploading: true });
    const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
    return new Promise((resolve) => {
      wx.uploadFile({
        url: `${API_BASE}/upload/resume`,
        filePath: file.path,
        name: 'file',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: async (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.error('[resume] upload non-2xx:', res);
            wx.showToast({ title: `上传失败 (${res.statusCode})`, icon: 'none' });
            this.setData({ uploading: false });
            return resolve(false);
          }
          let body;
          try { body = JSON.parse(res.data); } catch { body = res.data; }
          const data = (body && body.code === 0 && body.data) || body;
          if (!data || !data.url) {
            console.error('[resume] upload returned invalid body:', body);
            wx.showToast({ title: '上传响应异常', icon: 'none' });
            this.setData({ uploading: false });
            return resolve(false);
          }
          // 上传成功 → 同步到 Teacher 记录
          try {
            await meApi.save({
              resumeUrl: data.url,
              resumeFilename: file.name,
            });
            this.setData({
              resumeUrl: data.url,
              resumeFilename: file.name,
              resumeUploadedAt: new Date().toISOString(),
              resumeRejectReason: '',
              resumeStatus: 'PENDING_REVIEW',
              statusText: STATUS_TEXT.PENDING_REVIEW,
              uploading: false,
            });
            wx.showToast({ title: '已提交审核', icon: 'success' });
            resolve(true);
          } catch (err) {
            console.error('[resume] save resume meta failed:', err);
            wx.showToast({ title: err.message || '保存失败', icon: 'none' });
            this.setData({ uploading: false });
            resolve(false);
          }
        },
        fail: (err) => {
          console.error('[resume] uploadFile fail:', err);
          wx.showToast({ title: err.errMsg || '网络异常', icon: 'none' });
          this.setData({ uploading: false });
          resolve(false);
        },
      });
    });
  },

  async onRemove() {
    const ok = await new Promise((resolve) => {
      wx.showModal({
        title: '提示',
        content: '确定删除已上传的简历？',
        success: (res) => resolve(!!res.confirm),
      });
    });
    if (!ok) return;
    this.setData({ saving: true });
    try {
      await meApi.save({ resumeUrl: '', resumeFilename: '' });
      this.setData({
        resumeUrl: '',
        resumeFilename: '',
        resumeUploadedAt: '',
        resumeRejectReason: '',
        resumeStatus: 'EMPTY',
        statusText: '',
      });
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (err) {
      console.error('[resume] remove failed:', err);
      wx.showToast({ title: err.message || '删除失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  onPreview() {
    if (!this.data.resumeUrl) return;
    wx.showLoading({ title: '加载中…' });
    wx.downloadFile({
      url: this.data.resumeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'pdf',
            showMenu: true,
            fail: (e) => {
              console.error('[resume] openDocument fail:', e);
              wx.showToast({ title: '预览失败', icon: 'none' });
            },
          });
        } else {
          wx.showToast({ title: `下载失败 (${res.statusCode})`, icon: 'none' });
        }
      },
      fail: (e) => {
        console.error('[resume] downloadFile fail:', e);
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
      complete: () => wx.hideLoading(),
    });
  },
});
