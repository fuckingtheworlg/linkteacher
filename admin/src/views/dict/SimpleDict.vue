<template>
  <el-card>
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新增{{ title }}</el-button>
      <span class="muted">{{ list.length }} 条</span>
    </div>

    <el-table :data="list" v-loading="loading" border row-key="id" stripe>
      <el-table-column label="ID" prop="id" width="64" />
      <el-table-column label="编码" prop="code" min-width="160" />
      <el-table-column label="名称" prop="name" min-width="200" />
      <el-table-column label="排序" prop="sort" width="100" />
      <el-table-column label="启用" width="100">
        <template #default="{ row }">
          <el-switch v-model="row.active" @change="onToggleActive(row)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.id ? `编辑${title}` : `新增${title}`" width="420px" destroy-on-close>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="80px">
        <el-form-item label="编码" prop="code">
          <el-input v-model="dialog.form.code" :disabled="!!dialog.id" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="dialog.form.name" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dialog.form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
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
import type { DictItem } from '@/api/admin';

const props = defineProps<{
  title: string;
  loadFn: () => Promise<DictItem[]>;
  createFn: (data: Partial<DictItem>) => Promise<DictItem>;
  updateFn: (id: number, data: Partial<DictItem>) => Promise<DictItem>;
  removeFn: (id: number) => Promise<unknown>;
}>();

const list = ref<DictItem[]>([]);
const loading = ref(false);
const formRef = ref<FormInstance>();
const dialog = reactive({
  visible: false,
  id: 0,
  saving: false,
  form: { code: '', name: '', sort: 0, active: true } as Partial<DictItem>,
});

const rules = {
  code: [{ required: true, message: '请输入编码' }],
  name: [{ required: true, message: '请输入名称' }],
};

async function load() {
  loading.value = true;
  try {
    list.value = await props.loadFn();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialog.id = 0;
  dialog.form = { code: '', name: '', sort: 0, active: true };
  dialog.visible = true;
}
function openEdit(row: DictItem) {
  dialog.id = row.id;
  dialog.form = { code: row.code, name: row.name, sort: row.sort, active: row.active };
  dialog.visible = true;
}

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    dialog.saving = true;
    try {
      if (dialog.id) {
        await props.updateFn(dialog.id, dialog.form);
        ElMessage.success('已更新');
      } else {
        await props.createFn(dialog.form);
        ElMessage.success('已新增');
      }
      dialog.visible = false;
      load();
    } finally {
      dialog.saving = false;
    }
  });
}

async function onToggleActive(row: DictItem) {
  await props.updateFn(row.id, { code: row.code, name: row.name, sort: row.sort, active: row.active });
  ElMessage.success('已更新启用状态');
}

async function onDelete(row: DictItem) {
  await ElMessageBox.confirm(`确定删除「${row.name}」？`, '提示', { type: 'warning' });
  try {
    await props.removeFn(row.id);
    ElMessage.success('已删除');
    load();
  } catch { /* interceptor */ }
}

onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.muted { color: #9ca3af; font-size: 12px; }
</style>
