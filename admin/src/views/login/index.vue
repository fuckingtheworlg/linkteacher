<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2 class="title">UniClass 管理后台</h2>
      <p class="subtitle">请使用管理员账号登录</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="admin" autocomplete="username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="current-password"
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button type="primary" :loading="loading" class="submit" @click="onSubmit">登 录</el-button>
      </el-form>
      <p class="hint">默认账号 admin / Admin@123 （首次登录请尽快修改密码）</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const formRef = ref<FormInstance>();
const loading = ref(false);
const form = reactive({ username: '', password: '' });
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    loading.value = true;
    try {
      await auth.login(form.username, form.password);
      ElMessage.success('登录成功');
      const redirect = (route.query.redirect as string) || '/dashboard';
      router.push(redirect);
    } catch {
      // http interceptor 已 toast
    } finally {
      loading.value = false;
    }
  });
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1f2937 0%, #4338ca 100%); }
.login-card { width: 380px; padding: 16px 8px; }
.title { text-align: center; margin: 0 0 8px; font-size: 22px; color: #1f2937; }
.subtitle { text-align: center; margin: 0 0 24px; color: #6b7280; }
.submit { width: 100%; margin-top: 8px; }
.hint { color: #9ca3af; font-size: 12px; margin-top: 16px; text-align: center; }
</style>
