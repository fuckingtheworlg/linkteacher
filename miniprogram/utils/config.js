// 接口域名集中维护
//   - development：临时指向阿里云 ECS 公网 IP（开发者工具需勾选"不校验合法域名"）
//     如本机自己起了后端调试，改回 'http://localhost:3000/api'
//   - production：必须是已 ICP 备案的 HTTPS 域名，并在公众平台「服务器域名」白名单里
const ENV_MAP = {
  development: 'http://59.110.126.224/api',
  production: 'https://api.uniclass.example.com/api',
};

const env = 'development';

module.exports = {
  API_BASE: ENV_MAP[env],
  STORAGE_KEYS: {
    TOKEN: 'uniclass_token',
    USER: 'uniclass_user',
  },
};
