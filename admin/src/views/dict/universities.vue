<template>
  <el-card>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="中文 / 英文 名称" style="width: 240px" clearable @clear="reload" @keyup.enter="reload" />
      <el-input v-model="country" placeholder="国家（可选）" style="width: 160px" clearable />
      <el-button type="primary" @click="reload">查询</el-button>
      <el-button @click="openCreate">新增大学</el-button>
      <span class="muted">共 {{ total }} 条</span>
    </div>

    <el-table :data="list" v-loading="loading" border row-key="id" stripe>
      <el-table-column label="ID" prop="id" width="60" />
      <el-table-column label="中文名" prop="nameZh" min-width="160" />
      <el-table-column label="英文名" prop="nameEn" min-width="240" />
      <el-table-column label="国家 / 城市" min-width="160">
        <template #default="{ row }">{{ row.country }} {{ row.city ? '· ' + row.city : '' }}</template>
      </el-table-column>
      <el-table-column label="QS 排名 / 年份" width="160">
        <template #default="{ row }">
          <span v-if="row.qsRank">#{{ row.qsRank }} ({{ row.qsYear || '-' }})</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="reload"
        @size-change="reload"
      />
    </div>

    <el-dialog v-model="dialog.visible" :title="dialog.id ? '编辑大学' : '新增大学'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="dialog.form" :rules="rules" label-width="100px">
        <el-form-item label="中文名" prop="nameZh"><el-input v-model="dialog.form.nameZh" /></el-form-item>
        <el-form-item label="英文名" prop="nameEn"><el-input v-model="dialog.form.nameEn" /></el-form-item>
        <el-form-item label="国家" prop="country"><el-input v-model="dialog.form.country" /></el-form-item>
        <el-form-item label="城市"><el-input v-model="dialog.form.city" /></el-form-item>
        <el-form-item label="QS 排名"><el-input-number v-model="dialog.form.qsRank" :min="1" /></el-form-item>
        <el-form-item label="QS 年份"><el-input-number v-model="dialog.form.qsYear" :min="2010" :max="2099" /></el-form-item>
        <el-form-item label="Logo URL"><el-input v-model="dialog.form.logoUrl" /></el-form-item>
        <el-form-item label="排序权重"><el-input-number v-model="dialog.form.sortWeight" /></el-form-item>
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
import { dictApi } from '@/api/admin';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const country = ref('');
const loading = ref(false);

const formRef = ref<FormInstance>();
const dialog = reactive({
  visible: false,
  id: 0,
  saving: false,
  form: { nameZh: '', nameEn: '', country: '', city: '', qsRank: undefined, qsYear: 2025, logoUrl: '', sortWeight: 0, active: true } as any,
});
const rules = {
  nameZh: [{ required: true, message: '请输入中文名' }],
  nameEn: [{ required: true, message: '请输入英文名' }],
  country: [{ required: true, message: '请输入国家' }],
};

async function reload() {
  loading.value = true;
  try {
    const data = await dictApi.universities.list({
      keyword: keyword.value || undefined,
      country: country.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialog.id = 0;
  dialog.form = { nameZh: '', nameEn: '', country: '', city: '', qsRank: undefined, qsYear: 2025, logoUrl: '', sortWeight: 0, active: true };
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
        await dictApi.universities.update(dialog.id, dialog.form);
        ElMessage.success('已更新');
      } else {
        await dictApi.universities.create(dialog.form);
        ElMessage.success('已新增');
      }
      dialog.visible = false;
      reload();
    } finally {
      dialog.saving = false;
    }
  });
}

async function onDelete(row: any) {
  await ElMessageBox.confirm(`确定删除「${row.nameZh}」？`, '提示', { type: 'warning' });
  try {
    await dictApi.universities.remove(row.id);
    ElMessage.success('已删除');
    reload();
  } catch { /* interceptor */ }
}

onMounted(reload);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.muted { color: #9ca3af; font-size: 12px; }
.pagination { margin-top: 16px; text-align: right; }
</style>
