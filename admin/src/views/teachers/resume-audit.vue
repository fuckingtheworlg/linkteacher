<template>
  <el-card>
    <div class="toolbar">
      <el-radio-group v-model="filter" @change="reload">
        <el-radio-button value="PENDING_REVIEW">待审核</el-radio-button>
        <el-radio-button value="APPROVED">已通过</el-radio-button>
        <el-radio-button value="REJECTED">已驳回</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
      </el-radio-group>
      <el-input v-model="keyword" placeholder="昵称 / 手机 / openid" style="width: 240px" clearable @clear="reload" @keyup.enter="reload" />
      <el-button type="primary" @click="reload">查询</el-button>
      <span class="muted">共 {{ list.length }} 条</span>
    </div>

    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column label="ID" prop="id" width="60" />
      <el-table-column label="头像" width="70">
        <template #default="{ row }">
          <el-avatar :size="36" :src="row.user?.avatarUrl" />
        </template>
      </el-table-column>
      <el-table-column label="昵称" prop="user.nickname" min-width="120" />
      <el-table-column label="简历" min-width="200">
        <template #default="{ row }">
          <el-link v-if="row.resumeUrl" type="primary" :href="row.resumeUrl" target="_blank" :underline="false">
            📄 {{ row.resumeFilename || '查看' }}
          </el-link>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="同意展示" width="100">
        <template #default="{ row }">
          <el-tag :type="row.resumeAllowDisplay ? 'success' : 'info'" size="small">
            {{ row.resumeAllowDisplay ? '同意' : '不同意' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="resumeTagType(row.resumeStatus)">{{ resumeStatusText(row.resumeStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="上传时间" width="180">
        <template #default="{ row }">{{ formatDate(row.resumeUploadedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.resumeStatus !== 'APPROVED'" size="small" type="success" @click="audit(row, true)">通过</el-button>
          <el-button v-if="row.resumeStatus !== 'REJECTED'" size="small" type="danger" @click="openReject(row)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="rejectDialog.visible" title="驳回简历" width="420px">
    <el-form>
      <el-form-item label="原因">
        <el-input
          v-model="rejectDialog.reason"
          type="textarea"
          :rows="4"
          placeholder="例：简历中含联系方式（电话/邮箱/微信号），请去除后重新上传"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="rejectDialog.visible = false">取消</el-button>
      <el-button type="danger" :loading="rejectDialog.saving" @click="confirmReject">确认驳回</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { teacherApi } from '@/api/admin';

const filter = ref<'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'all'>('PENDING_REVIEW');
const keyword = ref('');
const loading = ref(false);
const list = ref<any[]>([]);

const rejectDialog = reactive({
  visible: false,
  saving: false,
  row: null as any,
  reason: '',
});

async function reload() {
  loading.value = true;
  try {
    // 复用 /api/admin/teachers 接口拉取，再前端按 resumeStatus 过滤
    const data = await teacherApi.list({
      keyword: keyword.value || undefined,
      page: 1,
      pageSize: 50,
    });
    let arr = data.list.filter((t: any) => t.resumeUrl);
    if (filter.value !== 'all') {
      arr = arr.filter((t: any) => t.resumeStatus === filter.value);
    }
    list.value = arr;
  } finally {
    loading.value = false;
  }
}

async function audit(row: any, approve: boolean) {
  try {
    await teacherApi.auditResume(row.id, approve);
    ElMessage.success('已通过简历');
    reload();
  } catch { /* interceptor */ }
}

function openReject(row: any) {
  rejectDialog.row = row;
  rejectDialog.reason = '';
  rejectDialog.visible = true;
}

async function confirmReject() {
  if (!rejectDialog.reason.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  rejectDialog.saving = true;
  try {
    await teacherApi.auditResume(rejectDialog.row.id, false, rejectDialog.reason);
    ElMessage.success('简历已驳回');
    rejectDialog.visible = false;
    reload();
  } finally {
    rejectDialog.saving = false;
  }
}

function resumeStatusText(s?: string) {
  return ({
    EMPTY: '未上传',
    PENDING_REVIEW: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回',
  } as Record<string, string>)[s || ''] || s || '-';
}
function resumeTagType(s?: string) {
  return ({
    PENDING_REVIEW: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    EMPTY: 'info',
  } as Record<string, any>)[s || 'EMPTY'];
}
function formatDate(s?: string) {
  return s ? new Date(s).toLocaleString() : '-';
}

onMounted(reload);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.muted { color: #9ca3af; font-size: 12px; }
</style>
