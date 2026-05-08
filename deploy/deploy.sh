#!/usr/bin/env bash
# UniClass 应用部署脚本（每次发版执行）
#
# 用法：
#   bash deploy/deploy.sh           # 增量发布（默认）：拉代码 + 装依赖 + build + migrate + pm2 reload
#   bash deploy/deploy.sh first     # 首次部署：会创建 .env、跑 seed、首次 pm2 start
#   bash deploy/deploy.sh quick     # 仅 git pull + build + reload（不动依赖与迁移）
#
# 注意：必须以应用账号（如 uniclass）身份运行，不要用 root

set -euo pipefail

cd "$(dirname "$0")/.."   # 切到项目根
ROOT="$(pwd)"
MODE="${1:-update}"

log() { echo -e "\n\033[1;36m[deploy:$MODE]\033[0m $*"; }
err() { echo -e "\n\033[1;31m[error]\033[0m $*" >&2; exit 1; }

if [[ "$(id -u)" -eq 0 ]]; then
  err "请勿以 root 身份执行，应用账号（如 uniclass）即可"
fi

# ============= 1. .env 检查 =============
if [[ ! -f server/.env ]]; then
  if [[ "$MODE" == "first" ]]; then
    log "首次部署，从 .env.production.example 创建 server/.env"
    cp deploy/.env.production.example server/.env
    cat <<TIP
⚠️  请用编辑器修改 server/.env，至少填写：
    - DATABASE_URL（含 MySQL 密码）
    - JWT_SECRET（请用 openssl rand -hex 32 生成）
    - WX_APPID / WX_SECRET（小程序后台获取）
    - UPLOAD_BASE_URL（生产域名）
    修改完成后，重新执行：bash deploy/deploy.sh first
TIP
    exit 1
  else
    err "server/.env 不存在，请先 bash deploy/deploy.sh first 初始化"
  fi
fi

# ============= 2. 拉代码 =============
log "拉取最新代码"
git pull --ff-only

# ============= 3. 安装依赖（quick 模式跳过） =============
if [[ "$MODE" != "quick" ]]; then
  log "安装根 + server + admin 依赖（npm workspaces）"
  npm install --no-audit --no-fund
fi

# ============= 4. 数据库迁移 =============
if [[ "$MODE" != "quick" ]]; then
  log "执行 Prisma migrate deploy（生产模式：只 apply 已有迁移，不会改 schema）"
  npm --workspace server run prisma:generate
  npm --workspace server exec -- prisma migrate deploy

  if [[ "$MODE" == "first" ]]; then
    log "首次部署：执行 seed"
    npm --workspace server run prisma:seed
  fi
fi

# ============= 5. 构建 =============
log "构建 server"
npm --workspace server run build

log "构建 admin（生成静态文件到 admin/dist）"
npm --workspace admin run build

# ============= 6. pm2 启停 =============
if pm2 describe uniclass-api >/dev/null 2>&1; then
  log "pm2 reload uniclass-api（零停机重启）"
  pm2 reload uniclass-api --update-env
else
  log "首次启动：pm2 start ecosystem.config.cjs"
  pm2 start "$ROOT/deploy/ecosystem.config.cjs"
  pm2 save

  cat <<TIP
⚠️  首次部署完成。请以 root 身份再执行一次以下命令，让 pm2 在重启后自动恢复：
    sudo env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
    （或更简单：sudo pm2 startup，按提示复制命令）
TIP
fi

log "✅ 部署完成。pm2 状态："
pm2 list
