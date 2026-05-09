import http from './http';

export type AdminRole = 'SUPER_ADMIN' | 'AUDITOR';
export type TeacherStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'OFFLINE';
export type BannerPosition = 'HOME_TOP' | 'HOME_MID';

export interface LoginResp {
  token: string;
  admin: {
    id: number;
    username: string;
    name: string;
    role: AdminRole;
    mustChangePwd: boolean;
  };
}

export const authApi = {
  login: (username: string, password: string) =>
    http.post<unknown, LoginResp>('/admin/auth/login', { username, password }),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post<unknown, { ok: true }>('/admin/auth/change-password', { oldPassword, newPassword }),
};

export interface TeacherStats {
  pending: number;
  approved: number;
  todayMatch: number;
}

export const teacherApi = {
  list: (params: {
    status?: TeacherStatus;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }) => http.get<unknown, { page: number; pageSize: number; total: number; list: any[] }>(
    '/admin/teachers',
    { params },
  ),
  detail: (id: number) => http.get<unknown, any>(`/admin/teachers/${id}`),
  audit: (id: number, approve: boolean, reason?: string) =>
    http.post<unknown, any>(`/admin/teachers/${id}/audit`, { approve, reason }),
  flags: (id: number, payload: { isCertified?: boolean; sortWeight?: number; status?: TeacherStatus }) =>
    http.post<unknown, any>(`/admin/teachers/${id}/flags`, payload),
  stats: () => http.get<unknown, TeacherStats>('/admin/teachers/stats/overview'),
};

export interface DictItem {
  id: number;
  code: string;
  name: string;
  sort: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const dictApi = {
  subjects: {
    list: () => http.get<unknown, DictItem[]>('/admin/subjects'),
    create: (data: Partial<DictItem>) => http.post<unknown, DictItem>('/admin/subjects', data),
    update: (id: number, data: Partial<DictItem>) => http.put<unknown, DictItem>(`/admin/subjects/${id}`, data),
    remove: (id: number) => http.delete<unknown, { ok: true }>(`/admin/subjects/${id}`),
  },
  curriculums: {
    list: () => http.get<unknown, DictItem[]>('/admin/curriculums'),
    create: (data: Partial<DictItem>) => http.post<unknown, DictItem>('/admin/curriculums', data),
    update: (id: number, data: Partial<DictItem>) => http.put<unknown, DictItem>(`/admin/curriculums/${id}`, data),
    remove: (id: number) => http.delete<unknown, { ok: true }>(`/admin/curriculums/${id}`),
  },
  universities: {
    list: (params: { keyword?: string; country?: string; page?: number; pageSize?: number }) =>
      http.get<unknown, { page: number; pageSize: number; total: number; list: any[] }>(
        '/admin/universities',
        { params },
      ),
    create: (data: any) => http.post<unknown, any>('/admin/universities', data),
    update: (id: number, data: any) => http.put<unknown, any>(`/admin/universities/${id}`, data),
    remove: (id: number) => http.delete<unknown, { ok: true }>(`/admin/universities/${id}`),
  },
};

export const bannerApi = {
  list: () => http.get<unknown, any[]>('/admin/banners'),
  create: (data: any) => http.post<unknown, any>('/admin/banners', data),
  update: (id: number, data: any) => http.put<unknown, any>(`/admin/banners/${id}`, data),
  remove: (id: number) => http.delete<unknown, { ok: true }>(`/admin/banners/${id}`),
};

export interface ArticleSummary {
  id: number;
  slug: string;
  title: string;
  active: boolean;
  updatedAt: string;
}
export interface ArticleDetail extends ArticleSummary {
  content: string;
  createdAt: string;
}

export const articleApi = {
  list: () => http.get<unknown, ArticleSummary[]>('/admin/articles'),
  detail: (id: number) => http.get<unknown, ArticleDetail>(`/admin/articles/${id}`),
  create: (data: { slug: string; title: string; content: string; active?: boolean }) =>
    http.post<unknown, ArticleDetail>('/admin/articles', data),
  update: (id: number, data: { slug: string; title: string; content: string; active?: boolean }) =>
    http.put<unknown, ArticleDetail>(`/admin/articles/${id}`, data),
  remove: (id: number) => http.delete<unknown, { ok: true }>(`/admin/articles/${id}`),
};

export const adminUserApi = {
  list: () => http.get<unknown, any[]>('/admin/users'),
  create: (data: { username: string; password: string; name: string; role: AdminRole }) =>
    http.post<unknown, any>('/admin/users', data),
  update: (id: number, data: { name?: string; role?: AdminRole; active?: boolean; newPassword?: string }) =>
    http.put<unknown, any>(`/admin/users/${id}`, data),
  remove: (id: number) => http.delete<unknown, { ok: true }>(`/admin/users/${id}`),
};
