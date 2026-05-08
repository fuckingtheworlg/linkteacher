# UniClass 国际课程导师匹配平台

面向国际课程（IGCSE / A-Level / IB / AP 等）的导师匹配平台。包含三端：

- **微信小程序**（`miniprogram/`）—— 学生浏览/筛选导师 + 导师在线填报资料
- **后端 API**（`server/`）—— NestJS + Prisma + MySQL
- **管理后台**（`admin/`）—— Vue 3 + Vite + Element Plus（导师审核、字典维护、Banner）

「帮我匹配 / 帮我对接老师」按钮统一通过 `<button open-type="contact">` 跳转到微信客服会话，**不做**站内 IM、支付与视频。

## 目录结构

```
linkteacher/
├── miniprogram/          # 原生微信小程序（不在 npm workspace 内）
├── server/               # NestJS 后端 API（端口 3000）
├── admin/                # Vue3 + Vite 管理后台（端口 5173）
├── docker-compose.yml    # 本地 MySQL 8
├── docs/progress/        # 模块进度文档（每个 Phase 一份）
└── package.json          # npm workspaces 根
```

## 快速开始

### 0. 前置依赖

- **Node.js >= 20**（项目使用 24.x 验证）
- **MySQL 8**：用 `docker compose up -d mysql` 起本地容器；如已自备 MySQL，请自行修改 `server/.env` 的 `DATABASE_URL`
- **微信开发者工具**：用于打开 `miniprogram/`

### 1. 安装依赖

```bash
npm install
```

> 该命令会同时安装 `server` 与 `admin` 工作空间的依赖。`miniprogram/` 工程独立、由微信开发者工具直接打开。

### 2. 起 MySQL 与初始化数据库

```bash
npm run db:up                                  # 启动 docker MySQL
cp server/.env.example server/.env             # 已存在则跳过
npm run db:migrate                             # 首次跑会创建所有表
npm run db:seed                                # 种子数据
```

种子数据包含：
- **科目**：数学、物理、化学、生物、英语、经济、计算机等 10 项
- **课程体系**：iGCSE / ALevel-CAIE / ALevel-爱德思 / ALevel-AQA / IB-HL/SL / AP 共 7 项
- **大学库**：英国 + 美国 + 中国港 共 24 所（含 QS 排名）
- **管理员**：`admin / Admin@123`（首次登录强制改密）
- **首屏 Banner**：CTB 国际竞赛运营位

### 3. 启动后端 + 管理后台

```bash
npm run dev:server                             # http://localhost:3000
# 另开一个终端
npm run dev:admin                              # http://localhost:5173
```

### 4. 打开管理后台

浏览器访问 `http://localhost:5173`，用 `admin / Admin@123` 登录，首次登录强制修改密码。

### 5. 打开小程序

用微信开发者工具 → 「导入项目」选择 `miniprogram/` 目录。

**上线前必须**完成：
1. 替换 `miniprogram/project.config.json` 的 `appid` 为真实小程序 AppID
2. 在微信公众平台「客服 → 多客服」开通客服并配置消息接收人，否则 `<button open-type="contact">` 点击会失败
3. 修改 `miniprogram/utils/config.js` 中 `production` 域名，并把 `env` 切到 `production`
4. 修改 `server/.env` 的 `WX_APPID` / `WX_SECRET`（开发期未填时使用 mock openid）
5. 在公众平台「开发管理」白名单里加入 API 域名（`https://api.uniclass.example.com`）
6. 部署后端到 HTTPS 域名（小程序不允许 HTTP）

## 端到端联调建议（本地）

1. 起 MySQL + migrate + seed
2. 起 NestJS：`npm run dev:server`
3. 起管理后台：`npm run dev:admin` → 用 admin 账号登录
4. 打开小程序，登录后默认是「学生」角色：
   - 列表页应能看到（暂无）老师列表 + CTB Banner 横幅 + 科目筛选标签
   - 在「我的」中点击「成为导师」进入资料编辑，填写所有必填项 → 提交审核
5. 回到管理后台「导师审核」，对该笔提交点「通过」
6. 小程序列表页拉新即可看到该位老师；点击进入详情页
7. 在详情页底部点「💬 帮我对接老师」会触发跳客服（开发期需要在真机上 + 真 AppID 才能正常跳转）

## 关键 API 地址

- 公开：`/api/health`、`/api/dict/{subjects|curriculums|universities}`、`/api/banners`、`/api/teachers`、`/api/teachers/:id`
- 微信小程序：`POST /api/wx/login`、`GET/PUT/POST /api/teacher/me*`、`POST /api/match/log`
- 管理后台：`POST /api/admin/auth/login`、`/api/admin/teachers*`、`/api/admin/{subjects|curriculums|universities|banners|users}`

## 角色与流程

- 任何微信用户首次进入即默认为 **学生**，可浏览与筛选老师
- 在「我的」页面点「成为导师」切换为 **导师** 角色，进入资料编辑
- 导师状态机：`DRAFT → PENDING → APPROVED / REJECTED`；只有 `APPROVED` 出现在学生端列表
- 管理员仅在 Web 后台登录，负责审核 + 字典 + Banner

## 开发约定

- **依赖管理**：永远从 monorepo 根目录用 `npm --workspace server install <pkg>` 或 `--workspace admin`，不要在子目录直接 `npm install`，否则可能未写入子 package.json
- **错误处理**：服务端 catch 必须打完整 stack；前端 axios 拦截器统一 toast；不允许空 catch
- **进度文档**：每个 Phase 完成后更新 `docs/progress/<模块>.md`
- **接口契约变更**：必须同步改后端 schema + 前端类型 + 文档

## 部署到阿里云 ECS

完整部署手册见 [deploy/README.md](./deploy/README.md)。简版流程：

```bash
# 1. ECS 上初始化
wget https://raw.githubusercontent.com/fuckingtheworlg/linkteacher/main/deploy/install-server.sh
sudo bash install-server.sh

# 2. 拉代码 + 配 .env + 首次部署
sudo -iu uniclass
cd /opt/uniclass
git clone https://github.com/fuckingtheworlg/linkteacher.git app
cd app && bash deploy/deploy.sh first

# 3. 配 nginx + HTTPS（详见 deploy/README.md 步骤 4）
```

日常发版：`bash deploy/deploy.sh`。

## 文档索引

| 文档 | 说明 |
|---|---|
| [docs/progress/phase-1-skeleton.md](./docs/progress/phase-1-skeleton.md) | monorepo 骨架与基建 |
| [docs/progress/phase-2-backend-api.md](./docs/progress/phase-2-backend-api.md) | 后端 API 全貌 |
| [docs/progress/phase-3-miniprogram.md](./docs/progress/phase-3-miniprogram.md) | 小程序 7 个页面 + 工具层 |
| [docs/progress/phase-4-admin.md](./docs/progress/phase-4-admin.md) | 管理后台 9 个页面 |
| [docs/progress/phase-5-integration.md](./docs/progress/phase-5-integration.md) | 联调收尾、依赖升级、已知限制 |
| [docs/progress/phase-6-deploy.md](./docs/progress/phase-6-deploy.md) | 阿里云部署方案与决策 |
| [deploy/README.md](./deploy/README.md) | 阿里云部署详细手册 |

## License

私有项目，未授权请勿分发。
