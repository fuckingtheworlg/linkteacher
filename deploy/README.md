# UniClass 阿里云 ECS 部署手册

> 适用：全新 Ubuntu 22.04 / 24.04（阿里云 ECS）+ 域名已 ICP 备案
>
> 部署形态：**单机 pm2 + nginx 反代**（小流量，最简）

## 一、阿里云 ECS 准备

| 项 | 推荐 |
|---|---|
| 实例规格 | 共享型 s6 / 突发型 t6（2 vCPU / 2 GB 内存以上） |
| 操作系统 | Ubuntu 22.04 LTS |
| 系统盘 | 40 GB（云盘 ESSD） |
| 安全组 | 放行 22 / 80 / 443；不要放行 3306 / 3000 |
| 带宽 | 按需配；MVP 阶段 1-3 Mbps 即可 |
| 域名 | 必须**已 ICP 备案**，否则 80/443 会被电信运营商拦截 |

## 二、首次部署（约 15 分钟）

### 步骤 1：服务器初始化

```bash
# 用 root 或拥有 sudo 的用户登录 ECS
ssh root@<ECS-公网-IP>

# 拷贝并执行初始化脚本
wget https://raw.githubusercontent.com/fuckingtheworlg/linkteacher/main/deploy/install-server.sh
sudo bash install-server.sh
```

脚本会自动安装：Node 20 / pm2 / MySQL 8 / nginx / 防火墙规则 / 应用账号 `uniclass`。

### 步骤 2：初始化 MySQL

```bash
sudo mysql_secure_installation       # 设置 root 密码、删除匿名用户、按提示一路 Y

sudo mysql -uroot -p
```

```sql
CREATE DATABASE uniclass DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'uniclass'@'localhost' IDENTIFIED BY '【请改成强密码】';
GRANT ALL ON uniclass.* TO 'uniclass'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 步骤 3：拉代码 + 配置 .env

```bash
sudo -iu uniclass
cd /opt/uniclass
git clone https://github.com/fuckingtheworlg/linkteacher.git app
cd app
bash deploy/deploy.sh first   # 第 1 次会停下来等你填 .env
```

按提示编辑 `server/.env`，至少填好：

- `DATABASE_URL` 中的 MySQL 密码（步骤 2 设置的）
- `JWT_SECRET`：用 `openssl rand -hex 32` 生成
- `CORS_ORIGINS`：替换为 `https://your-domain.com`
- `UPLOAD_BASE_URL`：替换为 `https://your-domain.com/uploads`
- `WX_APPID` / `WX_SECRET`：从微信公众平台拿

填完再次执行：

```bash
bash deploy/deploy.sh first   # 这次会跑通：迁移 + seed + build + pm2 启动
```

### 步骤 4：配置 nginx + HTTPS

```bash
exit                          # 退出 uniclass 账号回到 root/sudo
sudo cp /opt/uniclass/app/deploy/nginx-uniclass.conf /etc/nginx/sites-available/uniclass

# 修改 server_name 为真实域名
sudo sed -i 's/your-domain.com/【你的真实域名】/g' /etc/nginx/sites-available/uniclass

sudo ln -sf /etc/nginx/sites-available/uniclass /etc/nginx/sites-enabled/uniclass
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 申请免费 HTTPS（Let's Encrypt）
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 【你的真实域名】
```

certbot 会自动改写 nginx 配置加 SSL 块并配自动续期。

### 步骤 5：开机自启

```bash
sudo pm2 startup            # 复制输出的 sudo env ... 命令并执行
sudo -iu uniclass pm2 save  # 把当前 pm2 进程列表持久化
```

### 步骤 6：连通性自测

```bash
# 在 ECS 上
curl http://localhost:3000/api/health
# 在你本地
curl https://【你的真实域名】/api/health
```

期望返回 `{"code":0,"data":{"status":"ok",...},"message":"ok"}`。

## 三、日常发版

```bash
ssh uniclass@<ECS-IP>
cd /opt/uniclass/app
bash deploy/deploy.sh           # 增量发布（拉代码 + 装依赖 + migrate + build + 零停机 reload）
```

只改前端时，跳过 npm install / migrate 加快发布：

```bash
bash deploy/deploy.sh quick
```

## 四、常见运维命令

```bash
pm2 list                                      # 查看进程
pm2 logs uniclass-api --lines 200             # 查看后端日志
pm2 reload uniclass-api                       # 零停机重启
pm2 monit                                     # 实时监控

sudo nginx -t && sudo systemctl reload nginx  # 改 nginx 后

# 数据库备份（每天定时建议加 cron）
mysqldump -uuniclass -p uniclass | gzip > /opt/uniclass/backups/$(date +%F).sql.gz
```

## 五、回滚

```bash
cd /opt/uniclass/app
git log --oneline -n 10
git reset --hard <某个 commit>
bash deploy/deploy.sh           # 重新部署到该版本
```

⚠️ Prisma 迁移**只能向前**，回滚需要单独写 down 迁移。生产 schema 变更前必须备份数据。

## 六、配套小程序与公众平台

部署上线后，还需在微信公众平台 → 开发 → 开发管理：

- 「服务器域名」→ request 合法域名加 `https://【你的域名】`
- 「业务域名」→ 加 `https://【你的域名】`（如有 webview 跳转）
- 「客服 → 多客服」→ 开通客服，配置消息接收人

最后修改 `miniprogram/utils/config.js`：

```js
const env = 'production';
const ENV_MAP = {
  development: 'http://localhost:3000/api',
  production: 'https://【你的域名】/api',
};
```

## 七、安全清单（生产必查）

- [ ] MySQL 业务用户密码强度 ≥ 16 位
- [ ] `JWT_SECRET` 由 `openssl rand -hex 32` 生成，未提交到 git
- [ ] `server/.env` 文件权限 600（`chmod 600 server/.env`）
- [ ] UFW / 阿里云安全组**未对公网开放 3306 与 3000**
- [ ] HTTPS 证书已生效（`curl -I https://your-domain.com/api/health` 看 `HTTP/2 200`）
- [ ] 开通阿里云快照 / 跨地域备份策略
- [ ] 后台默认账号 `admin / Admin@123` 已修改密码
