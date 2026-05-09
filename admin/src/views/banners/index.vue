<template>
  <el-card>
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新增 Banner</el-button>
      <span class="muted">共 {{ list.length }} 条</span>
    </div>

    <el-table :data="list" v-loading="loading" border stripe row-key="id">
      <el-table-column label="ID" prop="id" width="64" />
      <el-table-column label="位置" width="120">
        <template #default="{ row }">
          <el-tag>{{ positionText(row.position) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标题" prop="title" min-width="200" />
      <el-table-column label="副标题" prop="subtitle" min-width="200" />
      <el-table-column label="图片" width="120">
        <template #default="{ row }">
          <el-image v-if="row.imageUrl" :src="row.imageUrl" style="width:80px;height:40px" />
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="链接" prop="link" min-width="160" show-overflow-tooltip />
      <el-table-column label="排序" prop="sort" width="80" />
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-switch v-model="row.active" @change="onToggle(row)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.id ? '编辑 Banner' : '新增 Banner'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="80px">
        <el-form-item label="位置" prop="position">
          <el-select v-model="dialog.form.position">
            <el-option label="首页顶部 (HOME_TOP)" value="HOME_TOP" />
            <el-option label="首页中部 (HOME_MID)" value="HOME_MID" />
            <el-option label="我的-关于我们 (ABOUT_US)" value="ABOUT_US" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title"><el-input v-model="dialog.form.title" /></el-form-item>
        <el-form-item label="副标题"><el-input v-model="dialog.form.subtitle" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="dialog.form.imageUrl" /></el-form-item>
        <el-form-item label="跳转链接"><el-input v-model="dialog.form.link" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="dialog.form.sort" :min="0" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="dialog.form.active" /></el-form-item>
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
import { bannerApi } from '@/api/admin';

const list = ref<any[]>([]);
const loading = ref(false);
const formRef = ref<FormInstance>();
const dialog = reactive({
  visible: false,
  id: 0,
  saving: false,
  form: { position: 'HOME_TOP', title: '', subtitle: '', imageUrl: '', link: '', sort: 0, active: true } as any,
});
const rules = {
  position: [{ required: true, message: '请选择位置' }],
  title: [{ required: true, message: '请输入标题' }],
};

async function load() {
  loading.value = true;
  try {
    list.value = await bannerApi.list();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialog.id = 0;
  dialog.form = { position: 'HOME_TOP', title: '', subtitle: '', imageUrl: '', link: '', sort: 0, active: true };
  dialog.visible = true;
}
function openEdit(row: any) {
  dialog.id = row.id;
  dialog.form = { ...row };
  dialog.visible = true;
}

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    dialog.saving = true;
    try {
      if (dialog.id) {
        await bannerApi.update(dialog.id, dialog.form);
      } else {
        await bannerApi.create(dialog.form);
      }
      ElMessage.success('已保存');
      dialog.visible = false;
      load();
    } finally {
      dialog.saving = false;
    }
  });
}

async function onToggle(row: any) {
  await bannerApi.update(row.id, { ...row });
  ElMessage.success('已更新');
}
async function onDelete(row: any) {
  await ElMessageBox.confirm(`确定删除「${row.title}」？`, '提示', { type: 'warning' });
  try {
    await bannerApi.remove(row.id);
    ElMessage.success('已删除');
    load();
  } catch { /* interceptor */ }
}

function positionText(p: string) {
  return ({ HOME_TOP: '首页顶部', HOME_MID: '首页中部', ABOUT_US: '我的-关于我们' } as Record<string, string>)[p] || p;
}

onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.muted { color: #9ca3af; font-size: 12px; }
</style>
