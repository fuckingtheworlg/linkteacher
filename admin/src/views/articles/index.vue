<template>
  <el-card>
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新增文章</el-button>
      <span class="muted">共 {{ list.length }} 条</span>
    </div>

    <el-table :data="list" v-loading="loading" border row-key="id" stripe>
      <el-table-column label="ID" prop="id" width="60" />
      <el-table-column label="Slug（小程序通过此值访问）" prop="slug" min-width="220">
        <template #default="{ row }">
          <code>{{ row.slug }}</code>
        </template>
      </el-table-column>
      <el-table-column label="标题" prop="title" min-width="220" />
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.id ? '编辑文章' : '新增文章'" width="720px" destroy-on-close>
      <el-alert
        type="info"
        :closable="false"
        title="提示：小程序按 slug 检索，常用 slug：partnership-rules（合作规则）/ about-us（关于我们）/ privacy-policy（隐私政策）"
        style="margin-bottom: 12px"
      />
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="80px">
        <el-form-item label="slug" prop="slug">
          <el-input v-model="dialog.form.slug" placeholder="例：partnership-rules（仅英文+中划线）" />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="dialog.form.title" />
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <el-input
            v-model="dialog.form.content"
            type="textarea"
            :rows="14"
            placeholder="按段落写作；空行作为段落分隔，小程序端会原样按行渲染"
          />
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
import { articleApi, type ArticleSummary } from '@/api/admin';

const list = ref<ArticleSummary[]>([]);
const loading = ref(false);
const formRef = ref<FormInstance>();
const dialog = reactive({
  visible: false,
  id: 0,
  saving: false,
  form: { slug: '', title: '', content: '', active: true },
});

const rules = {
  slug: [
    { required: true, message: '请输入 slug' },
    { pattern: /^[a-z0-9-]+$/, message: '仅允许小写英文、数字与中划线' },
  ],
  title: [{ required: true, message: '请输入标题' }],
  content: [{ required: true, message: '请输入正文' }],
};

async function load() {
  loading.value = true;
  try {
    list.value = await articleApi.list();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialog.id = 0;
  dialog.form = { slug: '', title: '', content: '', active: true };
  dialog.visible = true;
}

async function openEdit(row: ArticleSummary) {
  try {
    const detail = await articleApi.detail(row.id);
    dialog.id = detail.id;
    dialog.form = {
      slug: detail.slug,
      title: detail.title,
      content: detail.content,
      active: detail.active,
    };
    dialog.visible = true;
  } catch { /* interceptor */ }
}

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    dialog.saving = true;
    try {
      if (dialog.id) {
        await articleApi.update(dialog.id, dialog.form);
      } else {
        await articleApi.create(dialog.form);
      }
      ElMessage.success('已保存');
      dialog.visible = false;
      load();
    } finally {
      dialog.saving = false;
    }
  });
}

async function onDelete(row: ArticleSummary) {
  await ElMessageBox.confirm(`确定删除「${row.title}」？`, '提示', { type: 'warning' });
  try {
    await articleApi.remove(row.id);
    ElMessage.success('已删除');
    load();
  } catch { /* interceptor */ }
}

function formatDate(s: string) {
  return s ? new Date(s).toLocaleString() : '-';
}

onMounted(load);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.muted { color: #9ca3af; font-size: 12px; }
</style>
