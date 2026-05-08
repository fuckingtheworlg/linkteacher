const { get, post, put } = require('./request');

// 后端统一返回 { code: 0, data, message } 或异常 { statusCode, code, message }
// 我们在调用层把成功响应解包成 data 直接返回。
async function unwrap(promise) {
  const res = await promise;
  if (res && typeof res === 'object' && 'code' in res && 'data' in res) {
    return res.data;
  }
  return res;
}

const teachersApi = {
  list: (params) => unwrap(get('/teachers', params)),
  detail: (id) => unwrap(get(`/teachers/${id}`)),
};

const dictApi = {
  subjects: () => unwrap(get('/dict/subjects')),
  curriculums: () => unwrap(get('/dict/curriculums')),
  universities: (q) => unwrap(get('/dict/universities', q)),
};

const bannersApi = {
  list: (position = 'HOME_TOP') => unwrap(get('/banners', { position })),
};

const matchApi = {
  log: (sessionFrom, teacherId, meta) =>
    unwrap(post('/match/log', { sessionFrom, teacherId, meta }, { requireAuth: true })),
};

const meApi = {
  get: () => unwrap(get('/teacher/me', null, { requireAuth: true })),
  save: (payload) => unwrap(put('/teacher/me', payload, { requireAuth: true })),
  submit: () => unwrap(post('/teacher/me/submit', {}, { requireAuth: true })),
};

module.exports = { teachersApi, dictApi, bannersApi, matchApi, meApi };
