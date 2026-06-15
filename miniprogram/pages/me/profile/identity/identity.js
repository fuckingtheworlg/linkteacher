const { meApi } = require('../../../../utils/api');
const { API_BASE, STORAGE_KEYS } = require('../../../../utils/config');

Page({
  data: {
    loading: true,
    saving: false,
    realName: '',
    idCardFrontUrl: '',
    idCardBackUrl: '',
    addressDetail: '',
    latitude: null,
    longitude: null,
    uploadingFront: false,
    uploadingBack: false,
  },

  async onLoad() {
    try {
      const teacher = await meApi.get();
      const user = (teacher && teacher.user) || {};
      this.setData({
        loading: false,
        realName: (teacher && teacher.realName) || '',
        idCardFrontUrl: (teacher && teacher.idCardFrontUrl) || '',
        idCardBackUrl: (teacher && teacher.idCardBackUrl) || '',
        addressDetail: (teacher && teacher.addressDetail) || user.address || '',
        latitude: teacher && teacher.latitude !== null ? Number(teacher.latitude) : null,
        longitude: teacher && teacher.longitude !== null ? Number(teacher.longitude) : null,
      });
    } catch (err) {
      console.warn('[identity] preload failed (可忽略):', err);
      this.setData({ loading: false });
    }
  },

  onRealNameInput(e) {
    this.setData({ realName: e.detail.value });
  },

  // 选择并上传身份证
  pickIdCard(e) {
    const side = e.currentTarget.dataset.side; // 'front' | 'back'
    const stateKey = side === 'front' ? 'uploadingFront' : 'uploadingBack';
    const fieldKey = side === 'front' ? 'idCardFrontUrl' : 'idCardBackUrl';

    if (this.data[stateKey]) return;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const tempFile = res.tempFiles[0];
        if (!tempFile) return;
        await this.uploadImage(tempFile.tempFilePath, fieldKey, stateKey);
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
        console.error('[identity] chooseMedia fail:', err);
        wx.showToast({ title: '选择失败', icon: 'none' });
      },
    });
  },

  uploadImage(filePath, fieldKey, stateKey) {
    this.setData({ [stateKey]: true });
    const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
    return new Promise((resolve) => {
      wx.uploadFile({
        url: `${API_BASE}/upload/image`,
        filePath,
        name: 'file',
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: async (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.error('[identity] upload non-2xx:', res);
            wx.showToast({ title: `上传失败 (${res.statusCode})`, icon: 'none' });
            this.setData({ [stateKey]: false });
            return resolve(false);
          }
          let body;
          try { body = JSON.parse(res.data); } catch { body = res.data; }
          const data = (body && body.code === 0 && body.data) || body;
          if (!data || !data.url) {
            console.error('[identity] upload returned invalid body:', body);
            wx.showToast({ title: '上传响应异常', icon: 'none' });
            this.setData({ [stateKey]: false });
            return resolve(false);
          }
          try {
            await meApi.save({ [fieldKey]: data.url });
            this.setData({ [fieldKey]: data.url, [stateKey]: false });
            wx.showToast({ title: '上传成功', icon: 'success' });
            resolve(true);
          } catch (err) {
            console.error('[identity] save url failed:', err);
            wx.showToast({ title: err.message || '保存失败', icon: 'none' });
            this.setData({ [stateKey]: false });
            resolve(false);
          }
        },
        fail: (err) => {
          console.error('[identity] uploadFile fail:', err);
          wx.showToast({ title: err.errMsg || '网络异常', icon: 'none' });
          this.setData({ [stateKey]: false });
          resolve(false);
        },
      });
    });
  },

  previewIdCard(e) {
    const side = e.currentTarget.dataset.side;
    const url = side === 'front' ? this.data.idCardFrontUrl : this.data.idCardBackUrl;
    if (!url) return;
    wx.previewImage({ urls: [url] });
  },

  // 选择地址定位（chooseLocation 接口需要在公众平台「接口设置」申请审核）
  chooseLocation() {
    // 检测是否支持 chooseLocation
    if (typeof wx.chooseLocation !== 'function') {
      this.fallbackInputAddress();
      return;
    }
    wx.chooseLocation({
      success: (res) => {
        const detail = res.address ? `${res.address}${res.name ? ' · ' + res.name : ''}` : res.name;
        this.setData({
          addressDetail: detail,
          latitude: res.latitude,
          longitude: res.longitude,
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
        console.warn('[identity] chooseLocation fail, fallback to manual input:', err);
        // 未审批 chooseLocation 接口 / 用户拒绝授权 → 降级为手动输入
        this.fallbackInputAddress();
      },
    });
  },

  fallbackInputAddress() {
    wx.showModal({
      title: '请填写详细地址',
      content: '当前小程序未启用地图定位功能，请直接输入您的工作 / 服务地址（精确到街道）',
      editable: true,
      placeholderText: this.data.addressDetail || '例：英国伦敦市某街道某号',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ addressDetail: res.content.trim() });
        }
      },
    });
  },

  async onSave() {
    if (this.data.saving) return;
    if (!this.data.realName) {
      wx.showToast({ title: '请填写真实姓名', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await meApi.save({
        realName: this.data.realName,
        addressDetail: this.data.addressDetail || undefined,
        latitude: this.data.latitude !== null ? this.data.latitude : undefined,
        longitude: this.data.longitude !== null ? this.data.longitude : undefined,
      });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (err) {
      console.error('[identity] save failed:', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
