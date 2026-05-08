import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi, AdminRole } from '@/api/admin';
import { tokenStore } from '@/api/http';

const NAME_KEY = 'uniclass_admin_name';
const ROLE_KEY = 'uniclass_admin_role';
const USERNAME_KEY = 'uniclass_admin_username';

export const useAuthStore = defineStore('auth', () => {
  const name = ref<string>(localStorage.getItem(NAME_KEY) || '');
  const role = ref<AdminRole | ''>((localStorage.getItem(ROLE_KEY) as AdminRole) || '');
  const username = ref<string>(localStorage.getItem(USERNAME_KEY) || '');
  const mustChangePwd = ref<boolean>(false);

  const isLoggedIn = computed(() => !!tokenStore.get());
  const isSuperAdmin = computed(() => role.value === 'SUPER_ADMIN');

  async function login(u: string, p: string) {
    const resp = await authApi.login(u, p);
    tokenStore.set(resp.token);
    name.value = resp.admin.name;
    role.value = resp.admin.role;
    username.value = resp.admin.username;
    mustChangePwd.value = resp.admin.mustChangePwd;
    localStorage.setItem(NAME_KEY, resp.admin.name);
    localStorage.setItem(ROLE_KEY, resp.admin.role);
    localStorage.setItem(USERNAME_KEY, resp.admin.username);
    return resp.admin;
  }

  function logout() {
    tokenStore.clear();
    name.value = '';
    role.value = '';
    username.value = '';
    mustChangePwd.value = false;
  }

  async function changePassword(oldPwd: string, newPwd: string) {
    await authApi.changePassword(oldPwd, newPwd);
    mustChangePwd.value = false;
  }

  return { name, role, username, mustChangePwd, isLoggedIn, isSuperAdmin, login, logout, changePassword };
});
