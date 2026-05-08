// 接口域名集中维护：开发期 http；生产环境必须 HTTPS 并加入小程序服务器域名白名单
const ENV_MAP = {
  development: 'http://localhost:3000/api',
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
