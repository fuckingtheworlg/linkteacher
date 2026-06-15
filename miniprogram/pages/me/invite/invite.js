const { appShare, timelineShare } = require('../../../utils/share');

Page({
  data: {},

  onShareAppMessage() {
    // 邀请老师页保留专属文案
    return appShare('LinkTeacher 正在邀请你 — 直连全球优秀独立老师');
  },
  onShareTimeline() {
    return timelineShare();
  },
});
