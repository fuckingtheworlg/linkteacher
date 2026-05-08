#!/usr/bin/env bash
# UniClass 服务器初始化脚本（一次性运行）
#
# 适用：全新 Ubuntu 22.04 / 24.04（阿里云 ECS）
# 内容：Node 20 / MySQL 8 / Nginx / pm2 / git / 防火墙 / 时区
#
# 用法：
#   chmod +x install-server.sh
#   sudo bash install-server.sh

set -euo pipefail

log() { echo -e "\n\033[1;32m[install]\033[0m $*"; }
err() { echo -e "\n\033[1;31m[error]\033[0m $*" >&2; exit 1; }

if [[ "$(id -u)" -ne 0 ]]; then
  err "请用 root（或 sudo）运行：sudo bash install-server.sh"
fi

if ! grep -qiE 'ubuntu' /etc/os-release; then
  echo "[warn] 当前系统不是 Ubuntu，脚本主要在 Ubuntu 22/24 验证。继续？(y/N)"
  read -r ans
  [[ "$ans" =~ ^[Yy]$ ]] || exit 1
fi

# ============= 1. 系统时区 + 基础工具 =============
log "设置时区为 Asia/Shanghai"
timedatectl set-timezone Asia/Shanghai || true

log "更新 apt 索引并安装基础工具"
apt-get update -y
apt-get install -y curl wget git vim ca-certificates gnupg lsb-release ufw build-essential

# ============= 2. Node.js 20.x =============
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  log "安装 Node.js 20.x（NodeSource）"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  log "Node $(node -v) 已就绪，跳过"
fi

log "全局安装 pm2"
npm install -g pm2@latest

# ============= 3. MySQL 8 =============
if ! command -v mysql >/dev/null 2>&1; then
  log "安装 MySQL 8（apt）"
  DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
  systemctl enable --now mysql
else
  log "MySQL 已安装：$(mysql --version)"
fi

# ============= 4. Nginx =============
if ! command -v nginx >/dev/null 2>&1; then
  log "安装 Nginx"
  apt-get install -y nginx
  systemctl enable --now nginx
else
  log "Nginx 已安装"
fi

# ============= 5. UFW 防火墙 =============
log "配置 UFW 防火墙：放行 SSH / HTTP / HTTPS"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
# 不开放 3306 / 3000 给公网；只允许本机访问 MySQL 和后端
yes | ufw enable || true
ufw status

# ============= 6. 创建应用账号与目录 =============
APP_USER="${APP_USER:-uniclass}"
APP_DIR="${APP_DIR:-/opt/uniclass}"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "创建应用账号 $APP_USER"
  useradd -m -s /bin/bash "$APP_USER"
fi
mkdir -p "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# ============= 7. 提示用户初始化 MySQL =============
cat <<EOF

===========================================================
✅ 基础环境就绪。后续步骤（请手动执行）:

1) 初始化 MySQL（设置 root 密码 + 创建业务库）：
   sudo mysql_secure_installation
   sudo mysql -uroot -p
       CREATE DATABASE uniclass DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
       CREATE USER 'uniclass'@'localhost' IDENTIFIED BY '【请改成强密码】';
       GRANT ALL ON uniclass.* TO 'uniclass'@'localhost';
       FLUSH PRIVILEGES;
       EXIT;

2) 切换到应用账号，从 GitHub 拉取代码：
   sudo -iu $APP_USER
   cd $APP_DIR
   git clone https://github.com/fuckingtheworlg/linkteacher.git app
   cd app
   bash deploy/deploy.sh first

3) 配置 nginx：
   sudo cp deploy/nginx-uniclass.conf /etc/nginx/sites-available/uniclass
   sudo ln -sf /etc/nginx/sites-available/uniclass /etc/nginx/sites-enabled/uniclass
   sudo nginx -t && sudo systemctl reload nginx

4) （强烈推荐）申请 HTTPS 证书：
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com

⚠️  小程序生产环境必须 HTTPS，否则 wx.request 会被拒绝。
===========================================================
EOF
