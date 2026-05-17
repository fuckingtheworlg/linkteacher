Page({
  data: {},

  onShareAppMessage() {
    return {
      title: 'LinkTeacher 正在邀请你 — 直连全球优秀独立老师',
      path: '/pages/teachers/index/index',
    };
  },
  onShareTimeline() {
    return { title: 'LinkTeacher 直连全球优秀独立老师' };
  },
});
