<template>
  <el-card>
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新增管理员</el-button>
    </div>

    <el-table :data="list" v-loading="loading" border stripe row-key="id">
      <el-table-column label="ID" prop="id" width="64" />
      <el-table-column label="账号" prop="username" min-width="160" />
      <el-table-column label="姓名" prop="name" min-width="120" />
      <el-table-column label="角色" width="140">
        <template #default="{ row }">
          <el-tag :type="row.role === 'SUPER_ADMIN' ? 'danger' : ''">
            {{ row.role === 'SUPER_ADMIN' ? '超级管理员' : '审核员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后登录" width="180">
        <template #default="{ row }">{{ formatDate(row.lastLoginAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.id ? '编辑管理员' : '新增管理员'" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="100px">
        <el-form-item label="账号" prop="username">
          <el-input v-model="dialog.form.username" :disabled="!!dialog.id" />
        </el-form-item>
        <el-form-item v-if="!dialog.id" label="初始密码" prop="password">
          <el-input v-model="dialog.form.password" show-password />
        </el-form-item>
        <el-form-item v-else label="重置密码">
          <el-input v-model="dialog.form.newPassword" placeholder="留空表示不修改" show-password />
        </el-form-item>
        <el-form-item label="姓名" prop="name"><el-input v-model="dialog.form.name" /></el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="dialog.form.role">
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="审核员" value="AUDITOR" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dialog.id" label="启用">
          <el-switch v-model="dialog.form.active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.saving" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { adminUserApi, type AdminRole } from '@/api/admin';

interface AdminForm {
  username: string;
  password: string;
  newPassword?: string;
  name: string;
  role: AdminRole;
  active: boolean;
}

const list = ref<any[]>([]);
const loading = ref(false);
const formRef = ref<FormInstance>();
const dialog = reactive({
  visible: false,
  id: 0,
  saving: false,
  form: { username: '', password: '', newPassword: '', name: '', role: 'AUDITOR', active: true } as AdminForm,
});
const rules = {
  username: [{ required: true, min: 3, message: '账号至少 3 位' }],
  password: [{ required: true, min: 8, message: '密码至少 8 位' }],
  name: [{ required: true, message: '请输入姓名' }],
  role: [{ required: true, message: '请选择角色' }],
};

async function load() {
  loading.value = true;
  try {
    list.value = await adminUserApi.list();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialog.id = 0;
  dialog.form = { username: '', password: '', name: '', role: 'AUDITOR', active: true };
  dialog.visible = true;
}
function openEdit(row: any) {
  dialog.id = row.id;
  dialog.form = { username: row.username, password: '', newPassword: '', name: row.name, role: row.role, active: row.active };
  dialog.visible = true;
}

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    dialog.saving = true;
    try {
      if (dialog.id) {
        await adminUserApi.update(dialog.id, {
          name: dialog.form.name,
          role: dialog.form.role,
          active: dialog.form.active,
          newPassword: dialog.form.newPassword || undefined,
        });
      } else {
        await adminUserApi.create({
          username: dialog.form.username,
          password: dialog.form.password,
          name: dialog.form.name,
          role: dialog.form.role,
        });
      }
      ElMessage.success('已保存');
      dialog.visible = false;
      load();
    } finally {
      dialog.saving = false;
    }
  });
}

async function onDelete(row: any) {
  await ElMessageBox.confirm(`确定删除「${row.name}」？`, '提示', { type: 'warning' });
  try {
    await adminUserApi.remove(row.id);
    ElMessage.success('已删除');
    load();
  } catch { /* interceptor */ }
}

function formatDate(s?: string) {
  if (!s) return '-';
  return new Date(s).toLocaleString();
}

onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
</style>
