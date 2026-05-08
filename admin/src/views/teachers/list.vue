<template>
  <el-card>
    <div class="toolbar">
      <el-select v-model="status" placeholder="全部状态" clearable style="width: 160px" @change="reload">
        <el-option label="已上架" value="APPROVED" />
        <el-option label="已下架" value="OFFLINE" />
        <el-option label="待审核" value="PENDING" />
        <el-option label="已驳回" value="REJECTED" />
        <el-option label="草稿" value="DRAFT" />
      </el-select>
      <el-input v-model="keyword" placeholder="搜索昵称 / 手机号 / openid" style="width: 280px" clearable @clear="reload" @keyup.enter="reload" />
      <el-button type="primary" @click="reload">查询</el-button>
      <span class="muted">共 {{ total }} 条</span>
    </div>

    <el-table :data="list" v-loading="loading" border stripe row-key="id">
      <el-table-column label="ID" prop="id" width="64" />
      <el-table-column label="头像" width="70">
        <template #default="{ row }">
          <el-avatar :size="36" :src="row.user?.avatarUrl" />
        </template>
      </el-table-column>
      <el-table-column label="昵称" prop="user.nickname" min-width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="科目" min-width="200">
        <template #default="{ row }">
          <el-tag v-for="ts in row.subjects" :key="ts.id" size="small" style="margin-right: 4px">{{ ts.subject?.name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="课时费" width="100">
        <template #default="{ row }">¥{{ row.hourlyRate || '-' }}/h</template>
      </el-table-column>
      <el-table-column label="认证" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.isCertified" @update:model-value="onToggleCertified(row, $event)" />
        </template>
      </el-table-column>
      <el-table-column label="排序权重" width="120">
        <template #default="{ row }">
          <el-input-number :model-value="row.sortWeight" :min="0" :max="9999" size="small" @change="onChangeWeight(row, $event)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'APPROVED'" size="small" @click="onChangeStatus(row, 'OFFLINE')">下架</el-button>
          <el-button v-if="row.status === 'OFFLINE'" size="small" type="success" @click="onChangeStatus(row, 'APPROVED')">上架</el-button>
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
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { teacherApi, type TeacherStatus } from '@/api/admin';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const status = ref<TeacherStatus | undefined>(undefined);
const loading = ref(false);

async function reload() {
  loading.value = true;
  try {
    const data = await teacherApi.list({
      status: status.value,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function statusText(s: TeacherStatus) {
  return ({ DRAFT: '草稿', PENDING: '待审核', APPROVED: '已上架', REJECTED: '已驳回', OFFLINE: '已下架' } as Record<string, string>)[s] || s;
}
function statusTagType(s: TeacherStatus) {
  return ({ APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger', OFFLINE: 'info', DRAFT: '' } as Record<string, any>)[s];
}

async function onToggleCertified(row: any, v: boolean) {
  await teacherApi.flags(row.id, { isCertified: v });
  row.isCertified = v;
  ElMessage.success('已更新认证状态');
}

async function onChangeWeight(row: any, v: number) {
  await teacherApi.flags(row.id, { sortWeight: v });
  row.sortWeight = v;
  ElMessage.success('已更新排序权重');
}

async function onChangeStatus(row: any, st: TeacherStatus) {
  await teacherApi.flags(row.id, { status: st });
  row.status = st;
  ElMessage.success('已更新状态');
}

onMounted(reload);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.muted { color: #9ca3af; font-size: 12px; }
.pagination { margin-top: 16px; text-align: right; }
</style>
