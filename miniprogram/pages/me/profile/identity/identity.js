const { meApi } = require('../../../../utils/api');
const { API_BASE, STORAGE_KEYS } = require('../../../../utils/config');
const { appShare, timelineShare } = require('../../../../utils/share');

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

  onShareAppMessage() { return appShare(); },
  onShareTimeline() { return timelineShare(); },

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

  // 地址定位入口：优先 wx.getLocation 直接拿当前位置，失败 fallback 到地图选点
  chooseLocation() {
    this.tryAutoLocation();
  },

  // 自动定位：直接调 GPS，不弹地图
  tryAutoLocation() {
    if (typeof wx.getLocation !== 'function') {
      this.openMapPicker(); // 接口不支持就 fallback
      return;
    }
    wx.showLoading({ title: '定位中…', mask: true });
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.hideLoading();
        const lat = Number(res.latitude.toFixed(6));
        const lng = Number(res.longitude.toFixed(6));
        this.setData({
          addressDetail: `当前位置（${lat}, ${lng}）`,
          latitude: lat,
          longitude: lng,
        });
        wx.showToast({ title: '已自动定位', icon: 'success' });
      },
      fail: (err) => {
        wx.hideLoading();
        const msg = (err.errMsg || '').toLowerCase();
        if (msg.indexOf('cancel') >= 0) return;
        // 权限被拒 → 引导去设置
        if (msg.indexOf('auth') >= 0 || msg.indexOf('permission') >= 0 || msg.indexOf('deny') >= 0) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在「我的小程序设置」中打开位置权限后重试',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting();
            },
          });
          return;
        }
        // getLocation 未审核 / 其它失败 → fallback 到地图选点
        console.warn('[identity] getLocation fail, fallback to chooseLocation:', err);
        this.openMapPicker();
      },
    });
  },

  // 地图选点（fallback）：getLocation 不可用时让用户在地图上选
  openMapPicker() {
    if (typeof wx.chooseLocation !== 'function') {
      wx.showToast({ title: '定位接口不可用，请联系管理员', icon: 'none' });
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
        console.error('[identity] chooseLocation fail:', err);
        wx.showToast({ title: '定位失败，请稍后重试', icon: 'none' });
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
