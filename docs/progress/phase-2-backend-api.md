# Phase 2 · 后端核心 API

## 已完成

- [x] 全局基础设施（2026-05-08）
  - `src/common/exceptions/business.exception.ts` 业务异常
  - `src/common/filters/all-exceptions.filter.ts` 全局异常过滤器（含完整 stack 日志）
  - `src/common/interceptors/response.interceptor.ts` 统一响应包装 `{ code, data, message }`
  - `src/common/decorators/{public,current-user}.decorator.ts` 装饰器（@Public / @Audience / @Roles / @CurrentUser）
- [x] 鉴权 `auth/`
  - JWT Strategy + 全局 `JwtAuthGuard`（支持 @Public / @Audience('wx'|'admin') / @Roles）
  - `POST /api/wx/login`：`wx.login` code 换 openid → upsert User → 签 token；当 `WX_APPID/SECRET` 未配置时退化为开发期 mock openid
  - `POST /api/admin/auth/login`：账密 + bcrypt + JWT
  - `POST /api/admin/auth/change-password`：登录后改密（清 mustChangePwd）
- [x] 公共字典 `dict/`
  - `GET /api/dict/{subjects|curriculums|universities}`，支持大学按 country / keyword 检索
- [x] Banner `banners/`
  - `GET /api/banners?position=HOME_TOP`
- [x] 老师 `teachers/`
  - `GET /api/teachers`：筛选（subjectId / curriculumId / minRate / maxRate / keyword / sort=rate-asc/rate-desc/newest/smart）+ 分页，仅返 `APPROVED`
  - `GET /api/teachers/:id`：详情，仅返 `APPROVED`
  - `GET /api/teacher/me`：当前导师资料 + 关联（仅 wx token）
  - `PUT /api/teacher/me`：草稿保存（同步 user 卡片信息 + 整组覆盖 educations / subjects + curriculums）
  - `POST /api/teacher/me/submit`：必填校验通过后置 PENDING
- [x] 匹配日志 `match/`
  - `POST /api/match/log`：记录用户从哪个入口跳客服
- [x] 后台 `admin/`
  - `GET/POST /api/admin/teachers` 列表 + 详情
  - `POST /api/admin/teachers/:id/audit` 审核（通过自动 isCertified=true，驳回必须 reason）
  - `POST /api/admin/teachers/:id/flags` 调认证 / 排序权重 / 状态
  - `GET /api/admin/teachers/stats/overview` 看板数据
  - `CRUD /api/admin/{subjects|curriculums|universities|banners}` 字典与 banner 管理
  - `CRUD /api/admin/users` 管理员账号（仅 SUPER_ADMIN，删除前校验"至少保留 1 个 active 管理员"）
- [x] 上传 `upload/`：`POST /api/upload/image`，限 5MB，仅 PNG/JPG/WEBP/GIF，本地 `uploads/` 目录持久化
- [x] 全局应用 Guard / Filter / Interceptor（`APP_GUARD` 默认拦截一切，`@Public()` 明确放行）

## 关键决策

- **JWT 区分 audience**：小程序 token 与后台 token 共用同一 `JWT_SECRET`，但 payload 中 `audience: 'wx'|'admin'`；接口侧用 `@Audience('admin')` 强制校验，**避免**学生 token 被拿去刷后台接口。
- **统一返回包装 `{ code: 0, data, message: 'ok' }`**：异常走 filter 的 `{ statusCode, code, message, path, timestamp }`。前端 axios 拦截器统一处理这两种格式（admin 端在 Phase 4 落地）。
- **草稿整组覆盖 vs 增量 patch**：老师的 `educations` 与 `subjects+curriculums` 用"传整组就整组覆盖、不传就保持"的语义。理由：编辑页本身是一次性整页提交，避免增量 diff 的复杂度，遵循 `debug-methodology.mdc` §5 关于 schema/契约变更的可控性。
- **审核流必须填驳回原因**：`approve=false && !reason` 直接 400，遵循 `debug-methodology.mdc` §4 错误必须可见。
- **Prisma onModuleInit 失败时开发模式不阻塞**：production 仍然 throw 终止。这样无 DB 也能跑 health-check 和验证路由 + filter。
- **Multer 1.x 已有 CVE 警告**：本期沿用 `@nestjs/platform-express` 默认依赖，运行通过。Phase 5 联调时显式升级到 `multer@^2`。
- **JWT 默认密钥 `dev-secret`**：`JWT_SECRET` 未配置时退化使用，**生产环境必须**通过 `.env` 覆盖（README 已强调）。

## 已知限制 / 待办

- [ ] **未在本机连库实跑**：本机 MySQL 实例存在但 root 密码未知，且无 docker。所有 Service 已通过类型层 + 启动验证（路由 / filter / guard 全部命中），但实际 SQL 行为依赖 Phase 5 联调。
- [ ] 「智能排序」（`sort=smart`）当前与默认相同（sortWeight desc + approvedAt desc），后期可加入"匹配次数 / 收藏数"加权
- [ ] 未做 rate limit / IP 黑名单 / 请求体大小限制（除 upload 5MB）；MVP 期暂可接受，后期挂 Nginx + `@nestjs/throttler`
- [ ] 未实现"批量审核"，目前只能逐条；后台运营压力大时再加
- [ ] 收藏 (`Favorite` 表) schema 已建好，但接口未做（学生端 MVP 不需要，Phase 4+ 视情况补）
- [ ] CSRF：后台用 JWT + Authorization 头部，无 CSRF 风险；如未来切到 cookie session，需在 admin 接口前补 csrf 中间件

## 踩坑记录

- ⚠️ **现象**：`npm run start` 报 `Cannot find module 'dist/main.js'`，但 `npm run build` 退出码 0 且 `dist/` 目录存在。
  **根因**：原 `tsconfig.json` 的 `include` 同时包含 `src/**/*` 和 `prisma/**/*`，nest build 把 `prisma/seed.ts` 当作输入源，结果 dist 输出变成 `dist/src/main.js` + `dist/prisma/seed.js`，与 `package.json` 的 `node dist/main.js` 不匹配。
  **修复**：新增 `server/tsconfig.build.json`（仅 include `src/**/*`），并在 `server/nest-cli.json` 设置 `"tsConfigPath": "tsconfig.build.json"`。
  位置：[server/tsconfig.build.json](../../server/tsconfig.build.json) + [server/nest-cli.json](../../server/nest-cli.json)
- ⚠️ **现象**：health 接口可访问，但所有未声明 `@Public()` 的接口（包括字典 / banner）都被 401 拦截。
  **根因**：`APP_GUARD` 全局 JwtAuthGuard 默认拦截一切；最初 `health.controller` 漏写 `@Public()`。
  **修复**：所有公开只读接口显式标注 `@Public()`；登录接口同理。
  位置：[server/src/health/health.controller.ts](../../server/src/health/health.controller.ts) 等。
- ⚠️ **现象**：模拟登录返回 500 而非 401。
  **根因**：`AdminAuthService.login` 在 DB 不可用时让 Prisma 抛出连接错误，被 filter 转成 500——这是符合预期的"明确暴露根因"行为，不是 bug，但要注意：登录失败（账号错）应明确返回 401（已实现），DB 异常→500 也是预期。
  位置：[server/src/auth/admin-auth.service.ts](../../server/src/auth/admin-auth.service.ts)
