# Phase 1 · 骨架与基建

## 已完成

- [x] 根 monorepo 初始化（`package.json` + npm workspaces：server / admin）（2026-05-08）
- [x] `.gitignore` / `.editorconfig` / `README.md` / `docker-compose.yml`（MySQL 8）
- [x] `docs/progress/` 模块文档目录建立
- [x] **后端 server/**：NestJS 10 骨架（`main.ts` / `app.module.ts` / `prisma/` 模块 / `health` 控制器），`tsconfig.json` / `nest-cli.json` / `.env.example`
- [x] 后端运行时 + dev 依赖（NestJS/Prisma/Passport/JWT/class-validator/multer 等）安装完成；`npm --workspace server run build` 通过
- [x] **Prisma schema**（`server/prisma/schema.prisma`）：覆盖 `User` / `AdminUser` / `Subject` / `Curriculum` / `University` / `Teacher` / `TeacherEducation` / `TeacherSubject` / `TeacherSubjectCurriculum` / `Banner` / `Favorite` / `MatchLog` 共 12 张表 + 6 个枚举
- [x] **Prisma seed 脚本**（`server/prisma/seed.ts`）：科目 10 条 / 课程体系 7 条 / 大学库 24 所（英国 + 美国 + 中国港）/ 默认管理员 `admin/Admin@123` / 首屏 CTB Banner
- [x] `prisma generate` 已执行，`@prisma/client` 已生成
- [x] **管理后台 admin/**：Vue3 + Vite + Element Plus 骨架（路由含 `/login` 与 `/dashboard`，布局 `default-layout`，登录页 + 工作台占位卡片），`npm --workspace admin run build` 通过
- [x] **小程序 miniprogram/**：`app.json` / `app.js` / `app.wxss` 注册 7 个页面 + 2 项 tabBar，封装 `utils/config.js`、`utils/request.js`、`utils/auth.js`（基于 `wx.login` 换 token），所有页面建立空骨架占位等待 Phase 3 落地

## 关键决策

- **包管理用 npm workspaces 而非 pnpm**：原 plan 写 pnpm-workspace.yaml，本机仅有 npm，且 nest-cli + vite 对 npm workspaces 支持充分；切换不影响功能。如团队后续需要 pnpm，删除根 `package-lock.json` + 加 `pnpm-workspace.yaml` 即可平移。
- **小程序工程独立于 npm workspace**：`miniprogram/` 由微信开发者工具直接打开，不进入 root workspace 列表，避免 IDE 把 `.json` 当 npm 配置文件解析。
- **Decimal vs Float 选型（金额字段）**：`hourlyRate / trialRate` 用 `Decimal(10,2)`，避免浮点精度（遵循 `debug-methodology.mdc` 第 6 节关于精度敏感字段的要求）。
- **管理后台路由用 `createWebHashHistory`**：部署只需把 `dist/` 静态目录扔到任意 web server，无需 nginx 重写规则。如需要 history 模式，后续切换。
- **登录入口预留 token 协议**：`utils/auth.js` 调用 `POST /api/wx/login`，期望返回 `{ token, user }`；后端在 Phase 2 实现该接口。token 存 `wx_storage`，未登录的请求会主动拒绝（`requireAuth: true`），避免静默失败（遵循 `debug-methodology.mdc` 第 4 节）。
- **upload 用本地目录起步**：`server/uploads/` 通过 express.static 暴露在 `/uploads`；`UPLOAD_BASE_URL` 环境变量预留，便于切到 OSS/COS。

## 已知限制 / 待办

- [ ] **本机未安装 Docker**，未能实跑 `prisma migrate dev` 与 `prisma db seed`。用户需要：
  - 装 Docker Desktop 后执行 `npm run db:up && npm run db:migrate && npm run db:seed`
  - 或自备 MySQL 8，修改 `server/.env` 的 `DATABASE_URL` 后再跑 migrate / seed
- [ ] tabBar 图标暂未制作（`app.json` 中已移除 iconPath，先用纯文字 tabBar），Phase 3 制作 png 后补回 `assets/tabbar/*.png`
- [ ] 登录接口 `/api/wx/login` 在 Phase 1 仅在 admin 登录页占位（`admin/Admin@123` 本地 mock），实际后端实现属于 Phase 2
- [ ] ESLint / Prettier 配置未铺设（Phase 5 联调时再加，避免现在阻塞）
- [ ] 小程序 AppID 占位为 `wx0000000000000000`，**上线前必须**替换为真实 AppID 并在公众平台开通客服多客服与消息接收人，否则 `<button open-type="contact">` 无法跳转
- [ ] `multer@1.x` 报 CVE-2022-24434 高危告警（NestJS 10 默认依赖）；Phase 2 接入文件上传时显式指定 `multer@^1.4.5-lts.1` 或 `^2.x` 替换
- [ ] `dist/assets/index-*.js` chunk 1.16MB 超过 500KB 警告：Phase 4 完整后台铺开时再做 manualChunks 拆包

## 踩坑记录

- ⚠️ **现象**：在 `working_directory: server/` 直接执行 `npm install --save vue ...` 后，admin 构建报 `Cannot find module 'vue-router'`。
  **根因**：在 monorepo 子目录下且根 package.json 已声明 workspaces 时，npm 检测到当前 cwd 是子 workspace，却仍把 `--save` 的语义当作"过滤后保存"，结果只 hoist 了 `node_modules` 而**未把依赖写入 admin/package.json**——表现为 `audited 179 packages` 但 `package.json` 完全没变。
  **修复**：从 monorepo 根目录用 `npm --workspace admin install --save <pkgs>` 重装；本次提交后 `admin/package.json` 含完整 dependencies。
  位置：本次会话；后续任何依赖追加都必须从根目录走 `--workspace <name>`。
- ⚠️ **现象**：`vue-tsc` 报 14 处 TS2307 找不到模块（vue-router / element-plus / pinia 等），但 `vite dev` 仍能跑。
  **根因**：上面那条踩坑的同因——依赖未写入 `admin/package.json` 时 hoist 机制把 vue 装到了根 `node_modules`，部分能 resolve（vue），部分不能（vue-router 直到第二次安装才装）。
  **修复**：见上一条。验证：`npm --workspace admin run build` 现在 0 错误退出（仅 sass legacy API 弃用提示）。
- ⚠️ **现象**：`docker --version` 返回 command not found。
  **根因**：本机未安装 Docker。
  **修复**：在 README + 本文档显式声明依赖，由用户决定安装 Docker 或自备 MySQL；未阻塞 Phase 1 其它交付物。
