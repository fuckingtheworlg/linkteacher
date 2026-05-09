<template>
  <el-container class="layout-root">
    <el-aside width="220px" class="layout-aside">
      <div class="logo">UniClass</div>
      <el-menu :default-active="route.path" :default-openeds="['dict']" router class="menu" background-color="#1f2937" text-color="#cbd5e1" active-text-color="#ffffff">
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <el-sub-menu index="teachers">
          <template #title>
            <el-icon><User /></el-icon>
            <span>导师</span>
          </template>
          <el-menu-item index="/teachers/audit">导师审核</el-menu-item>
          <el-menu-item index="/teachers/list">导师管理</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="dict">
          <template #title>
            <el-icon><Files /></el-icon>
            <span>字典管理</span>
          </template>
          <el-menu-item index="/dict/subjects">科目</el-menu-item>
          <el-menu-item index="/dict/curriculums">课程体系</el-menu-item>
          <el-menu-item index="/dict/universities">大学库</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/banners">
          <el-icon><Picture /></el-icon>
          <span>Banner</span>
        </el-menu-item>
        <el-menu-item index="/articles">
          <el-icon><Document /></el-icon>
          <span>文章管理</span>
        </el-menu-item>
        <el-menu-item index="/admins" v-if="auth.isSuperAdmin">
          <el-icon><Setting /></el-icon>
          <span>管理员账号</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <span class="title">{{ (route.meta.title as string) || '' }}</span>
        <el-dropdown @command="onCommand">
          <span class="user">
            {{ auth.name || '管理员' }} <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="changePwd">修改密码</el-dropdown-item>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-dialog v-model="pwdDialog.visible" title="修改密码" width="420px" :close-on-click-modal="false">
    <el-form ref="pwdFormRef" :model="pwdDialog.form" :rules="pwdRules" label-position="top">
      <el-form-item label="原密码" prop="oldPassword">
        <el-input v-model="pwdDialog.form.oldPassword" type="password" show-password />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="pwdDialog.form.newPassword" type="password" show-password />
      </el-form-item>
      <el-form-item label="再次输入新密码" prop="confirm">
        <el-input v-model="pwdDialog.form.confirm" type="password" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="pwdDialog.visible = false">取消</el-button>
      <el-button type="primary" :loading="pwdDialog.saving" @click="onSubmitPwd">提交</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance } from 'element-plus';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const pwdFormRef = ref<FormInstance>();
const pwdDialog = reactive({
  visible: false,
  saving: false,
  form: { oldPassword: '', newPassword: '', confirm: '' },
});

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    { min: 8, message: '至少 8 位' },
  ],
  confirm: [
    { required: true, message: '请再次输入新密码' },
    {
      validator: (_: unknown, value: string, cb: (err?: Error) => void) => {
        if (value !== pwdDialog.form.newPassword) cb(new Error('两次输入不一致'));
        else cb();
      },
    },
  ],
};

watchEffect(() => {
  if (auth.mustChangePwd) {
    pwdDialog.visible = true;
  }
});

function onCommand(cmd: string) {
  if (cmd === 'logout') {
    auth.logout();
    router.push('/login');
  } else if (cmd === 'changePwd') {
    pwdDialog.visible = true;
  }
}

async function onSubmitPwd() {
  if (!pwdFormRef.value) return;
  await pwdFormRef.value.validate(async (valid) => {
    if (!valid) return;
    pwdDialog.saving = true;
    try {
      await auth.changePassword(pwdDialog.form.oldPassword, pwdDialog.form.newPassword);
      ElMessage.success('密码已更新');
      pwdDialog.visible = false;
      pwdDialog.form = { oldPassword: '', newPassword: '', confirm: '' };
    } finally {
      pwdDialog.saving = false;
    }
  });
}
</script>

<style scoped>
.layout-root { height: 100vh; }
.layout-aside { background: #1f2937; color: #fff; overflow-y: auto; }
.logo { height: 60px; line-height: 60px; text-align: center; font-size: 20px; font-weight: 700; letter-spacing: 1px; color: #fff; }
.menu { border-right: none; background: transparent; }
:deep(.el-menu) { background: transparent; }
:deep(.el-menu-item.is-active) { background: #111827 !important; color: #fff !important; }
:deep(.el-sub-menu__title:hover), :deep(.el-menu-item:hover) { background: #111827 !important; }
.layout-header { display: flex; justify-content: space-between; align-items: center; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04); }
.title { font-size: 16px; font-weight: 600; color: #1f2937; }
.user { cursor: pointer; color: #1f2937; display: inline-flex; align-items: center; gap: 4px; }
</style>
