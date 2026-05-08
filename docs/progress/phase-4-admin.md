# Phase 4 · 管理后台

## 已完成

- [x] HTTP 层（2026-05-08）
  - `src/api/http.ts` 基于 axios 封装：自动带 Bearer / 401 跳登录 + 清 token / 解包后端 `{ code, data, message }` / 错误统一 toast 并完整 `console.error` stack
  - `src/api/admin.ts` 类型化 API：`authApi` / `teacherApi` / `dictApi` / `bannerApi` / `adminUserApi`
- [x] 鉴权 store
  - `src/store/auth.ts` 登录 / 登出 / 修改密码 / `mustChangePwd` 状态
  - 路由守卫：未登录跳 `/login`、已登录访问 `/login` 跳 `/dashboard`
- [x] 布局 + 菜单
  - 左侧深色侧栏 + Logo + 多级菜单（工作台 / 导师审核 / 导师管理 / 字典-科目/课程体系/大学库 / Banner / 管理员账号）
  - 顶部：当前页标题 + 用户名下拉（修改密码 / 退出登录）
  - 全局密码修改对话框：登录后 `mustChangePwd=true` 自动弹出
  - "管理员账号"菜单仅 SUPER_ADMIN 可见
- [x] 登录页
  - 真实接入 `/api/admin/auth/login`，支持回车提交，错误由 http 拦截器统一 toast
- [x] 工作台
  - 4 个数据卡片（待审核 / 已上架 / 今日匹配 / 系统状态），数据来自 `/api/admin/teachers/stats/overview`
  - 快速操作入口
- [x] 导师审核 `/teachers/audit`
  - PENDING 状态列表 + 关键词搜索 + 分页
  - 抽屉详情：基础信息、报价、教育背景、辅导内容（含课程体系 tag）、主页要点 / 工作履历 / 个人荣誉
  - 通过 / 驳回（驳回必须填原因，与后端约束一致）
- [x] 导师管理 `/teachers/list`
  - 全状态筛选 + 关键词 + 分页
  - 行内开关：是否认证 (`isCertified`) / 排序权重 (`sortWeight`) / 上下架（APPROVED ⇄ OFFLINE）
- [x] 字典管理（基于通用 `SimpleDict.vue` 复用）
  - 科目 / 课程体系：列表 + 新增 + 编辑 + 启用开关 + 删除
  - 大学库：分页 + keyword + country 筛选 + 完整字段编辑（QS 排名 / 年份 / Logo / 排序权重）
- [x] Banner 管理
  - 列表（位置 / 图片缩略 / 链接）+ 新增 / 编辑 / 启用开关 / 删除
- [x] 管理员账号 `/admins`（仅 SUPER_ADMIN）
  - 列表 + 新建（账号 + 初始密码 + 角色）+ 编辑（姓名/角色/启用 + 重置密码可选）+ 删除（后端拒绝最后一个 active 管理员被删）

## 关键决策

- **响应结构两态共存**：成功响应 `{ code: 0, data, message }` 在拦截器自动解包成 `data`；失败响应直接保留 `{ statusCode, code, message }` 并 toast。这种设计让上层业务代码完全不用关心包装层，仅聚焦在领域类型上。
- **路由 hash 模式**：方便部署到任意静态文件 host 而无需 nginx 重写。生产域名直接挂 `dist/` 即可。
- **菜单权限**：`isSuperAdmin` 判断只控制菜单显示；真正的权限校验在后端（`@Roles('SUPER_ADMIN')`），遵循"前端权限可绕过、最终以后端为准"的安全原则。
- **首次登录强制改密**：登录后若 `mustChangePwd=true`，布局组件 `watchEffect` 自动弹出修改密码对话框；用户改密成功后下次登录起跳过。
- **大学库 / 字典的删除二次确认**：`ElMessageBox.confirm` 异步阻塞，避免误删；后端额外做"已被引用则拒绝删除"的二次保护，建议改为 `active=false`。
- **复用 SimpleDict 组件**：科目和课程体系字段结构一致（code/name/sort/active），抽出通用组件减少重复代码。但大学库字段差异大、独立写。
- **不做"批量审核"**：MVP 阶段单条审核足够；后台运营压力大时再加。

## 已知限制 / 待办

- [ ] **未连库联调**：所有页面在静态分析 + `npm run build` 通过下完成。最终交互与数据回填验证放在 Phase 5。
- [ ] **chunk 1.2MB 超过 500KB 警告**：当前所有 Element Plus 组件从同一 entry 引入。可通过 `unplugin-vue-components` + 按需引入或路由级 manualChunks 优化，Phase 5 视性能需要再做。
- [ ] **未做 `Banner.imageUrl` 的图片上传**：当前是手动填 URL；后期可对接 `/api/upload/image`。
- [ ] **未做"导师 me 历史版本对比"**：审核抽屉中只展示当前提交版本；如果运营要求"对比上次版本"，需要新增 schema（`TeacherSnapshot`）和接口。先记录在此。
- [ ] **数据看板**：当前只有 3 个核心指标。后期可加：每日新增老师 / 每日匹配 / 转化漏斗。
- [ ] **sass legacy API 弃用警告**：build 时打印一次，不影响功能；待 element-plus 生态切换到 sass 2 时自动消失。

## 踩坑记录

- ⚠️ **现象**：401 跳转登录后，登录成功但页面停留 `/login`。
  **根因**：路由守卫早期版本没正确处理"已登录访问 /login → 重定向到 redirect query"。如果 query.redirect 是登录页本身（被无限重定向），会卡住。
  **修复**：守卫里只在 token 存在且当前是 `/login` 时跳 dashboard；登录组件里读 `route.query.redirect` 并跳到目标页（默认 `/dashboard`）。
  位置：[admin/src/router/index.ts](../../admin/src/router/index.ts)、[admin/src/views/login/index.vue](../../admin/src/views/login/index.vue)
- ⚠️ **现象**：早期 axios 拦截器把所有响应都当作"包装态"解包，导致 `404 / 5xx` 时返回的 `{ statusCode, message }` 被当成业务数据返回，前端业务逻辑用错误数据继续走。
  **根因**：axios 4xx/5xx 响应触发 reject 而非 resolve；只在 `resolve` 路径里解包是正确的，但 `code !== 0` 的情况要排除。
  **修复**：拦截器只在 `body.code === 0` 时解包返回 `data`，否则保留原 body。错误统一走 reject 路径并 toast。
  位置：[admin/src/api/http.ts](../../admin/src/api/http.ts)
