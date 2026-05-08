# Phase 6 · 阿里云 ECS 部署

## 已完成

- [x] 部署套件 `deploy/`（2026-05-08）
  - `install-server.sh`：全新 Ubuntu 一键安装 Node 20 / pm2 / MySQL 8 / Nginx / UFW + 创建应用账号 `uniclass`
  - `deploy.sh`：三种模式（first / update / quick），自动 `git pull → npm install → prisma migrate deploy → npm build → pm2 reload`
  - `ecosystem.config.cjs`：pm2 配置（fork 单实例 + 自动重启 + 内存上限 512M + 日志归档）
  - `nginx-uniclass.conf`：admin/dist 静态托管 + `/api` 反代到 3000 + `/uploads` 直发 + gzip + 安全头
  - `.env.production.example`：含 6 项必填项（MySQL 密码 / JWT_SECRET / WX 凭证 / 域名等）
  - `README.md`：6 步首次部署 + 日常发版 + 回滚 + 安全清单
- [x] 主 README 加入"部署到阿里云"入口与简版流程
- [x] `.gitignore` 添加 `logs/` 与 `.pm2/`，避免运行时产物被 commit

## 关键决策

- **方案 A：手动 pm2 + nginx**（用户选择）
  - 适合单机 / 小流量 MVP；零运维成本，发版只要 `git pull && deploy.sh`
  - 不适合多实例 / 蓝绿 / 灰度（这些需要 Phase 7+ 切换到 K8s 或阿里云 ACK）
- **拒绝方案 B（Docker Compose）**：用户偏好简单部署，pm2 + nginx 完全够用；引入 Docker 反而增加 ECS 资源占用与排错复杂度
- **拒绝方案 C（GitHub Actions 自动 CI/CD）**：MVP 阶段发版频率低，GitHub Actions 在国内连阿里云有时网络不稳；可在 Phase 7+ 业务稳定后再加，本次先保留手动可控的 deploy.sh
- **prisma migrate deploy 而非 dev**：生产环境**只 apply 已存在的迁移**，避免 dev 命令在生产上根据 schema 漂移生成新迁移导致脏数据；这遵循 `debug-methodology.mdc` §5 关于 schema 变更的原则
- **upload 文件 nginx 直发**：`/uploads` 路径在 nginx 中用 `alias` 直接映射到 `server/uploads/` 目录，不经过 Node。性能比 express.static 高一个量级，且能用 nginx 的 `expires` 头让浏览器缓存 30 天
- **应用账号隔离**：所有应用进程跑在 `uniclass` 用户下；安装脚本只用 root，部署用 `uniclass`，避免 npm install 出来的 node_modules 被 root 持有导致后续无法清理
- **UFW + 阿里云安全组双层**：UFW 在 OS 层面只开放 22/80/443；阿里云安全组同样只开放这三个；MySQL 3306 与后端 3000 **不开放公网**，强制走 nginx 反代
- **HTTPS 走 certbot --nginx 自动管理**：免费、自动续期；唯一前提是域名已 ICP 备案

## 已知限制 / 待办

- [ ] **未在真实 ECS 上跑过完整脚本**：脚本基于公认最佳实践编写（NodeSource 源 / pm2 startup 标准流程 / certbot --nginx 模板），但用户在第一次执行时仍可能遇到环境差异（例如阿里云镜像源差异、ufw 未默认安装等）。脚本中已加 `set -euo pipefail` 让异常立即可见；任何报错可直接发回我帮调
- [ ] **数据库备份未自动化**：deploy/README.md 给了手动 mysqldump 命令；建议后期加 cron + OSS 跨域备份
- [ ] **GitHub Actions CI 未配置**：MVP 阶段没必要；后期需要 PR 自动跑 lint/test 时可以加 `.github/workflows/ci.yml`
- [ ] **未配置 Webhook 自动部署**：当前 push 后还需 SSH 到服务器执行 deploy.sh；如果想做到 push 自动部署，可以装 `webhook` 包或写 GitHub Actions
- [ ] **未做日志切割**：pm2 默认只追加日志文件，长期会变大。建议加 `pm2-logrotate` 模块：`pm2 install pm2-logrotate`
- [ ] **域名未 ICP 备案是阻塞项**：阿里云 ECS 在国内节点未备案的域名会被运营商拦截 80/443 端口；需要提前 1-3 周在阿里云控制台提交备案

## 踩坑记录

- ⚠️ **现象**（预期会遇到）：`sudo bash install-server.sh` 在阿里云 Ubuntu 上 NodeSource 仓库连接超时。
  **根因**：阿里云国际镜像与国内镜像差异、防火墙不放出 443 等。
  **修复**：脚本失败后，可手动走 nodesource 镜像或淘宝源：
  ```bash
  curl -fsSL https://npmmirror.com/mirrors/node/v20.18.0/node-v20.18.0-linux-x64.tar.xz -o node.tar.xz
  ```
  本次先按官方源执行，遇到问题再切换。
- ⚠️ **现象**（预期）：`prisma migrate deploy` 在 server 子目录不能直接跑，提示找不到 schema.prisma。
  **根因**：Prisma CLI 默认从当前工作目录查 `prisma/schema.prisma`，而 monorepo 根目录跑时 schema 在 `server/prisma/`。
  **修复**：deploy.sh 用 `npm --workspace server exec -- prisma migrate deploy`，npm workspaces 自动切换到 server 目录。
- ⚠️ **现象**（预期）：管理后台部分接口 401 但 nginx 已正确反代。
  **根因**：CORS_ORIGINS 仍是开发期的 localhost:5173，生产域名访问时被后端 enableCors 拦截。
  **修复**：`.env.production.example` 中 `CORS_ORIGINS` 必须改为生产域名；deploy/README.md 步骤 3 已强调此点。
