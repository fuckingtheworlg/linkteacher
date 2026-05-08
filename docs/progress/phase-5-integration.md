# Phase 5 · 联调与文档收尾

## 已完成

- [x] 升级 `multer` 到 `^2.0.0`，去除 CVE-2022-24434 高危告警（2026-05-08）
- [x] `admin/vite.config.ts` 切换 sass 到 `modern-compiler` API，消除 build 时 deprecation 警告
- [x] `npm run build` 在 server / admin 双端均通过（`@uniclass/server` 与 `@uniclass/admin` 编译 0 错误）
- [x] 完整重写根 `README.md`：覆盖目录结构 / 前置依赖 / 6 步快速开始 / 端到端联调步骤 / 上线前清单 / 开发约定 / 文档索引
- [x] 完整 5 个阶段进度文档：[Phase1](./phase-1-skeleton.md) / [Phase2](./phase-2-backend-api.md) / [Phase3](./phase-3-miniprogram.md) / [Phase4](./phase-4-admin.md) / Phase5（本文）
- [x] 进度文档 INDEX：[docs/progress/README.md](./README.md)

## 关键决策

- **本机无 docker / 无 MySQL 凭证**，无法在交付前实跑数据库迁移与端到端流程；选择把"联调步骤"写进 README，由用户在本机或测试环境完成首次联调，并把"未联调"明确列为已知限制——避免静默掩盖。这遵循 `ai-working-contract.mdc` §3.2 诚实报告原则。
- **不"为了消警告而升级一切"**：admin 的 chunk size 警告（1.2MB）属于性能优化范畴，不影响功能，本期保持现状，标注后续优化方向（manualChunks / 按需引入 ElementPlus）。
- **占位图未补**：`miniprogram/assets/avatar-default.png` 等仍是占位路径，由用户/设计提供后再放置。WXSS 的背景色保证图片缺失时不会塌掉布局。

## 已知限制 / 待办（交付清单）

> 以下为整个项目的待办合集，按优先级降序。

### 上线前阻塞项（用户必须处理）

- [ ] 把 `miniprogram/project.config.json` 的 `appid` 替换为真实小程序 AppID
- [ ] 把 `server/.env` 的 `WX_APPID` / `WX_SECRET` 填为真实值（否则 wx.login 走 mock 模式，仅适合本地开发）
- [ ] 在微信公众平台「客服」开通多客服并配置消息接收人，否则两个客服按钮在真机点不开
- [ ] 部署后端到 HTTPS，把 `miniprogram/utils/config.js` 的 `env='production'` 切换并替换域名
- [ ] 设置 `server/.env` 的 `JWT_SECRET` 为强密码（开发期默认 `dev-secret`）
- [ ] 把数据库密码改强；当前 docker-compose 中 root 密码为 `root`、业务用户密码为 `uniclass`，仅适合本地

### 体验/能力增强（可选）

- [ ] 默认头像 / 校徽占位图 → 让小程序无图加载时更美观
- [ ] tabBar 自定义图标 → 当前为纯文字
- [ ] 学生端「收藏」功能（schema 已就位，前后端接口未做）
- [ ] 「智能排序」加入个性化加权（当前等价于 `sortWeight desc`）
- [ ] admin 「导师资料历史快照」与版本对比
- [ ] OSS / COS 接入：上传切到云存储（`IStorageService` 接口已预留）
- [ ] 接入 Sentry 或类似异常监控

### 工程健壮性

- [ ] ESLint + Prettier 统一规范
- [ ] CI（GitHub Actions / Gitee Go）：跑 typecheck + build + 简单 e2e
- [ ] admin 路由级懒加载 + manualChunks，把 1.2MB 主 chunk 拆开
- [ ] 加 `@nestjs/throttler` 限流；`/api/upload` 加文件类型签名校验（不只 mimetype）

## 整体技术清单

| 端 | 技术 | 关键库 |
|---|---|---|
| 小程序 | 原生 | wx 内置 + 自封 request/auth/api/format |
| 后端 | NestJS 10 | Prisma 5 / Passport JWT / class-validator / multer 2 / bcryptjs |
| 后台 | Vue 3.5 + Vite 5 | Pinia / vue-router / Element Plus 2 / axios |
| 数据库 | MySQL 8 | Prisma 客户端 |
| 部署（建议） | Docker | nginx 反向代理 + HTTPS |

## 踩坑记录

- ⚠️ **现象**：`multer@1.x` 报 CVE-2022-24434 高危告警。
  **根因**：`@nestjs/platform-express` 默认依赖 multer 1.x；该版本对 application/x-www-form-urlencoded 解析有 DoS 漏洞。
  **修复**：显式 `npm --workspace server install --save 'multer@^2.0.0'`；@types/multer 与 multer 1.x/2.x API 兼容（diskStorage / FileFilter 不变），`server/src/upload/upload.controller.ts` 无需改动。
  位置：[server/package.json](../../server/package.json)
- ⚠️ **现象**：`admin` build 输出 `DEPRECATION WARNING [legacy-js-api]`。
  **根因**：vite 默认调用 sass 旧版 JS API；sass 2.0 即将移除该 API。
  **修复**：vite.config.ts 增加 `css.preprocessorOptions.scss = { api: 'modern-compiler' }`，编译性能也更好。
  位置：[admin/vite.config.ts](../../admin/vite.config.ts)
- ⚠️ **整体复盘**：本次完整 5 个阶段交付，所有源码与文档均已就位，但**未在本机实跑数据库**。后续用户在本地起 MySQL + migrate + seed 后，应着重验证：
  1. wx 小程序 `wx.login` 链路（mock 模式与真实 code2Session 切换）
  2. 导师 me 草稿保存（`PUT /api/teacher/me`）的整组覆盖 educations / subjects 行为
  3. 审核状态机三态切换 + 驳回原因展示在导师小程序「我的」页
  4. 客服按钮 `session-from` 是否可在公众平台后台看到正确分流
