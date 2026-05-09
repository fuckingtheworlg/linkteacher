import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { tokenStore } from '@/api/http';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { requiresAuth: false, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/default-layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { requiresAuth: true, title: '工作台' },
      },
      {
        path: 'teachers/audit',
        name: 'teachers-audit',
        component: () => import('@/views/teachers/audit.vue'),
        meta: { requiresAuth: true, title: '导师审核' },
      },
      {
        path: 'teachers/resume-audit',
        name: 'teachers-resume-audit',
        component: () => import('@/views/teachers/resume-audit.vue'),
        meta: { requiresAuth: true, title: '简历审核' },
      },
      {
        path: 'teachers/list',
        name: 'teachers-list',
        component: () => import('@/views/teachers/list.vue'),
        meta: { requiresAuth: true, title: '导师管理' },
      },
      {
        path: 'dict/subjects',
        name: 'dict-subjects',
        component: () => import('@/views/dict/subjects.vue'),
        meta: { requiresAuth: true, title: '科目管理' },
      },
      {
        path: 'dict/curriculums',
        name: 'dict-curriculums',
        component: () => import('@/views/dict/curriculums.vue'),
        meta: { requiresAuth: true, title: '课程体系' },
      },
      {
        path: 'dict/universities',
        name: 'dict-universities',
        component: () => import('@/views/dict/universities.vue'),
        meta: { requiresAuth: true, title: '大学库' },
      },
      {
        path: 'banners',
        name: 'banners',
        component: () => import('@/views/banners/index.vue'),
        meta: { requiresAuth: true, title: 'Banner 管理' },
      },
      {
        path: 'articles',
        name: 'articles',
        component: () => import('@/views/articles/index.vue'),
        meta: { requiresAuth: true, title: '文章管理' },
      },
      {
        path: 'admins',
        name: 'admins',
        component: () => import('@/views/admins/index.vue'),
        meta: { requiresAuth: true, title: '管理员账号', superAdminOnly: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const hasToken = !!tokenStore.get();
  if (to.meta.requiresAuth && !hasToken) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if (to.path === '/login' && hasToken) {
    next({ path: '/dashboard' });
  } else {
    next();
  }
  if (to.meta.title) {
    document.title = `${to.meta.title as string} - UniClass 管理后台`;
  }
});

export default router;
