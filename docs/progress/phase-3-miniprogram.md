# Phase 3 · 微信小程序前端

## 已完成

- [x] 工具层（2026-05-08）
  - `utils/config.js` 接口域名 + 存储 key
  - `utils/request.js` 通用请求（自动带 token、401 清 token、网络错误透传）
  - `utils/auth.js` 基于 `wx.login` 的 token 换发逻辑（开发期 mock）
  - `utils/api.js` 业务接口封装（teachers / dict / banners / match / me），统一解包后端 `{ code, data, message }`
  - `utils/format.js` 价格 / 性别符号 / 学位文本格式化
- [x] 列表页 `pages/teachers/index/`（图1 完整还原）
  - 顶部搜索框（输入即更新；回车查询）
  - CTB Banner（来源 `/api/banners`）
  - 横向滚动科目筛选条（含「全部」+ 字典动态科目）
  - 二级筛选（课程体系 ▾ / 课时收费 ▾ 占位 / 智能排序 ▾ / 更多筛选 ▾）+ 下拉浮层
  - 老师卡片（头像、姓名、性别、地点、专业、科目 pill、课时费、试听费、亮点摘要、已认证）
  - 下拉刷新 + 上拉加载分页
  - 右下角圆形悬浮「帮我匹配」按钮（`open-type="contact" session-from="home_match_button"`）
- [x] 详情页 `pages/teachers/detail/`（图2 完整还原）
  - 深色背景头部：头像 + 姓名 + 性别符号 + 已认证 + 收藏 ⭐
  - 地点行
  - `headlines` 多条要点（带 *）
  - meta 行：tags pill（INTJ / 05 后老师等）+ 授课语言文本
  - 主科目 pill 行 + 黄色课时费 + 试听半价
  - 教育背景卡片（QS#xx + 本科/硕士标 + 校 logo + 中英文校名 + 专业）
  - 辅导内容（科目 pill + iGCSE 行 + ALevel 体系合并行）
  - 底部固定「💬 帮我对接老师」（`session-from="teacher_detail_<id>"`）
- [x] 我的 tabbar 页 `pages/me/index/`
  - 用户卡片（头像 + 昵称 + 角色徽标 STUDENT/TEACHER + 状态文案）
  - 驳回原因高亮提醒（仅状态 REJECTED）
  - 菜单项：编辑导师资料 / 成为导师 / 联系客服（`open-type="contact"`）/ 退出登录
- [x] 编辑资料主页 `pages/me/profile/index/`（图3 + 图4 完整还原）
  - 顶部自定义返回 / 主页 / 标题胶囊
  - 个人卡片（头像 + 昵称 + MBTI + 地址）
  - 报价信息（辅导内容一/二、试听价、报价单、起报小时）
  - 背景信息（学历背景 1/2、授课语言、教龄、指导经验、我的标签）
  - 补充信息（工作履历、个人荣誉）
  - 帮助文案 + 「提交审核」按钮 + UniClass 小助手二维码占位
  - 「✎ 编辑」入口跳转独立子页保存后回填
- [x] 单字段编辑子页 `pages/me/profile/edit/`
  - 元数据驱动：12 个字段（昵称、MBTI、地址、试听价、课时费、起报、语言、教龄、指导经验、标签、工作履历、个人荣誉、主页要点）
  - 类型支持：input / number / integer / textarea / tags（多值换行或英文逗号）/ lines / mbti（4×4 网格）
- [x] 学历背景子页 `pages/me/profile/education/`
  - 大学 picker：底部抽屉 + 实时搜索 `/api/dict/universities`
  - 学位单选（本/硕/博/其他）
  - 专业 / 入学 / 毕业年份
  - 保存时整组覆盖 educations，保留另一段背景的数据
- [x] 辅导内容子页 `pages/me/profile/subjects/`
  - 科目单选 grid + 课程体系多选 grid（每项 `_selected` 预标记）
  - 补充说明文本框
  - 保存时按 slotIndex（一 / 二）合并到 subjects 数组

## 关键决策

- **WXML 不允许调用 JS 函数**：所有"格式化文本""选中状态""下标判断"必须**预先在 setData 时计算并放进 data 对象**。我把 `fmtPrice` 调用、`indexOf` 判断都改成了"打标"模式（`item._selected`、`hourlyRateText` 等）。这是小程序新人最常踩的坑，遵循 `debug-methodology.mdc` §1 先读源码而非猜测的原则——直接查官方文档确认能力边界。
- **客服按钮全部用 `open-type="contact"`**：`button[open-type="contact"]` 是微信原生跳客服会话的唯一合规方式。本项目两处入口 + 「我的-联系客服」入口都按此实现，并通过 `session-from` 参数让客服后台区分入口（`home_match_button` / `teacher_detail_<id>` / `me_contact_us`），同时调用 `/api/match/log` 留痕便于后台统计转化。
- **子页 vs 一屏长表单**：图三/图四的「编辑资料」如果做成一屏整表会非常长且每个字段都要单独保存，体验差。改为"主页只展示 + 进入子页编辑保存 + 返回主页 onShow 自动刷新"模式：
  - 单字段子页用元数据驱动，复用一套 UI；
  - 学历 / 辅导内容因为需要选择字典数据，单独写两个子页。
- **后端契约整组覆盖**：保存学历或辅导内容时，将"未编辑的另一条 + 当前编辑后的这条"打包成完整数组发给后端，后端 `upsertMe` 整组覆盖。避免增量同步的状态一致性问题，遵循 `ai-working-contract.mdc` §2.4「Schema/契约变更必须同步」精神。
- **登录依赖**：所有需要鉴权的请求统一在 `request.js` 用 `requireAuth: true` 标注；未登录时不发请求，直接 reject `{ code: 401, message: '未登录' }`。`utils/auth.js` 在 `app.onLaunch` + 我的页面 `onShow` 兜底 `ensureLogin`，避免出现"看似登录实际无 token"的静默失败（遵循 `debug-methodology.mdc` §4）。
- **navigation bar 适配**：图三/图四看到的是页面顶部「↶ ⌂ 编辑资料」的胶囊按钮——这是因为 `app.json` 配的 `navigationBarBackgroundColor: #1f2937`，但页面内还想有自定义的返回 + 主页按钮。我没改 app.json，而是在编辑页内显式画了胶囊（业务等价、实现简单）。

## 已知限制 / 待办

- [ ] **本机未联调**：本项目使用本地 mysql 无凭证 + 无 docker，未在真机或开发者工具中端到端走通；目前所有页面都是基于"接口契约 + 静态分析"完成。Phase 5 联调时必跑完整流程。
- [ ] **未做美术资源**：所有 `image` 组件引用的 `/assets/avatar-default.png`、`/assets/edu-default.png` 不存在。开发者工具会有 console warning，但不影响渲染（image 组件加载失败时该位置为空）。Phase 5 前补占位图或改为纯 CSS 头像/校徽。
- [ ] **AppID 未配置**：`project.config.json` 用 `wx0000000000000000`，需替换为真实 AppID 并在公众平台开通客服多客服 + 配置消息接收人，否则 `<button open-type="contact">` 在真机点击会失败。
- [ ] **「课时收费」「更多筛选」筛选项**当前是占位按钮，未接入面板（默认排序 / 更多筛选项暂未规划）。建议 Phase 5 收集运营需求后增量实现。
- [ ] **「智能推荐」排序**目前等价于后端 `sortWeight desc`，未引入个性化匹配；MVP 阶段够用。
- [ ] **收藏功能**主页面有按钮和本地状态，但未对接后端 `Favorite` 表（schema 已建好）；放入 Phase 4+ 视情况实现。

## 踩坑记录

- ⚠️ **现象**：微信开发者工具一打开就报"页面 `pages/me/profile/edit/edit` 无法找到对应文件"。
  **根因**：第一次写 `app.json` 时，路径写成 `pages/me/profile/edit/index`（与文件夹名不同），导致 4 个文件都找不到。微信小程序的页面引用要求 `路径 + 文件名`完全匹配 .js / .wxml / .wxss / .json 四件套。
  **修复**：本次提交统一为 `<dir>/<dir>` 双段命名（如 `edit/edit`、`education/education`），与文件名一致。
  位置：[miniprogram/app.json](../../miniprogram/app.json)
- ⚠️ **现象**：`{{ fmtPrice(teacher.hourlyRate) }}` 在真机上返回空白。
  **根因**：WXML 表达式只能引用 `data` 上的属性 + 部分内置字面量运算，**不能调用 JS 函数**（哪怕在 Page 上挂载）。需要 wxs 模块或预先在 setData 时计算。
  **修复**：在 setData 同步写入 `hourlyRateText`、`trialRateText`、`minHoursText` 等格式化结果，WXML 直接读字符串。
  位置：[miniprogram/pages/teachers/detail/detail.js](../../miniprogram/pages/teachers/detail/detail.js)、[miniprogram/pages/me/profile/index/index.js](../../miniprogram/pages/me/profile/index/index.js)
- ⚠️ **现象**：辅导内容多选课程体系点击无响应。
  **根因**：原 WXML 用 `selectedCurriculumIds.indexOf(item.id) >= 0` 做"是否选中"判断，但 WXML 表达式不支持调用数组方法。
  **修复**：每次选中变化都重新生成 `curriculums` 列表（每项加 `_selected: boolean`），WXML 直接读 `item._selected`。
  位置：[miniprogram/pages/me/profile/subjects/subjects.js](../../miniprogram/pages/me/profile/subjects/subjects.js)
