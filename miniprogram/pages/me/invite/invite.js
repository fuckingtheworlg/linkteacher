Page({
  data: {},

  onShareAppMessage() {
    return {
      title: 'UniClass 正在邀请你 — 直连全球优秀独立老师',
      path: '/pages/teachers/index/index',
    };
  },
  onShareTimeline() {
    return { title: 'UniClass 直连全球优秀独立老师' };
  },
});
