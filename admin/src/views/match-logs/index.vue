<template>
  <el-card class="stat-card">
    <div class="stat-title">入口分布（累计）</div>
    <div class="stat-row">
      <div v-for="e in byEntry" :key="e.sessionFrom" class="stat-item">
        <div class="stat-num">{{ e.count }}</div>
        <div class="stat-label">{{ e.sessionFrom }}</div>
      </div>
      <div v-if="!byEntry.length" class="muted">暂无数据</div>
    </div>
  </el-card>

  <el-card style="margin-top: 16px;">
    <div class="toolbar">
      <el-input v-model="sessionFrom" placeholder="按入口筛选（home_match_button / teacher_detail_xx）" style="width: 320px" clearable @clear="reload" @keyup.enter="reload" />
      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="-"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        value-format="YYYY-MM-DDTHH:mm:ss"
        @change="reload"
      />
      <el-button type="primary" @click="reload">查询</el-button>
      <span class="muted">共 {{ total }} 条</span>
    </div>

    <el-table :data="list" v-loading="loading" border stripe row-key="id">
      <el-table-column label="ID" prop="id" width="80" />
      <el-table-column label="入口" prop="sessionFrom" min-width="180" />
      <el-table-column label="用户" min-width="160">
        <template #default="{ row }">
          <span v-if="row.user">{{ row.user.nickname || row.user.openid }}</span>
          <span v-else class="muted">已删除</span>
        </template>
      </el-table-column>
      <el-table-column label="老师" min-width="160">
        <template #default="{ row }">
          <span v-if="row.teacher">#{{ row.teacher.id }} {{ row.teacher.user?.nickname }}</span>
          <span v-else class="muted">无</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="200">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="reload"
        @size-change="reload"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { matchLogApi } from '@/api/admin';

const list = ref<any[]>([]);
const byEntry = ref<Array<{ sessionFrom: string; count: number }>>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const sessionFrom = ref('');
const dateRange = ref<[string, string] | null>(null);
const loading = ref(false);

async function reload() {
  loading.value = true;
  try {
    const data = await matchLogApi.list({
      sessionFrom: sessionFrom.value || undefined,
      since: dateRange.value?.[0] || undefined,
      until: dateRange.value?.[1] || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    list.value = data.list;
    total.value = data.total;
    byEntry.value = data.byEntry;
  } finally {
    loading.value = false;
  }
}

async function onDelete(row: any) {
  await ElMessageBox.confirm('确定删除该匹配日志？仅删除日志记录，不影响其他数据', '提示', { type: 'warning' });
  try {
    await matchLogApi.remove(row.id);
    ElMessage.success('已删除');
    reload();
  } catch { /* interceptor */ }
}

function formatDate(s?: string) {
  return s ? new Date(s).toLocaleString() : '-';
}

onMounted(reload);
</script>

<style scoped>
.stat-card { padding: 8px 16px; }
.stat-title { color: #6b7280; font-size: 13px; margin-bottom: 12px; }
.stat-row { display: flex; gap: 24px; flex-wrap: wrap; }
.stat-item { padding: 4px 16px; border-right: 1px solid #f3f4f6; }
.stat-item:last-child { border-right: none; }
.stat-num { font-size: 24px; font-weight: 700; color: #1f2937; }
.stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.muted { color: #9ca3af; font-size: 12px; }
.pagination { margin-top: 16px; text-align: right; }
</style>
