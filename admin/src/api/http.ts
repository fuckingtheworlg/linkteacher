import axios, { AxiosError, AxiosInstance } from 'axios';
import { ElMessage } from 'element-plus';

const TOKEN_KEY = 'uniclass_admin_token';
const NAME_KEY = 'uniclass_admin_name';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || '',
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem('uniclass_admin_role');
    localStorage.removeItem('uniclass_admin_username');
  },
};

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(
  (resp) => {
    const body = resp.data;
    if (body && typeof body === 'object' && 'code' in body && 'data' in body && body.code === 0) {
      return body.data;
    }
    return body;
  },
  (err: AxiosError<{ message?: string; code?: string; statusCode?: number }>) => {
    const status = err.response?.status;
    const body = err.response?.data;
    const message = (body && typeof body === 'object' && body.message) || err.message || '网络异常';

    // 服务端必须能从日志里看到完整 stack，遵循 debug-methodology §4
    console.error('[http] error:', err.config?.method, err.config?.url, status, body);

    if (status === 401) {
      tokenStore.clear();
      const onLoginPage = location.hash && location.hash.startsWith('#/login');
      if (onLoginPage) {
        // 登录页 401 = 账号或密码错误（或类似登录失败），直接展示后端 message
        ElMessage.error(typeof message === 'string' ? message : '账号或密码错误');
      } else {
        // 非登录页 401 = token 失效，跳登录
        ElMessage.error('登录已过期，请重新登录');
        location.hash = `#/login?redirect=${encodeURIComponent(location.hash.slice(1))}`;
      }
    } else {
      ElMessage.error(typeof message === 'string' ? message : JSON.stringify(message));
    }
    return Promise.reject(err);
  },
);

export default http;
