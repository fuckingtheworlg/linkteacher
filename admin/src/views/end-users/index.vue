<template>
  <el-card>
    <div class="toolbar">
      <el-select v-model="role" placeholder="全部角色" clearable style="width: 140px" @change="reload">
        <el-option label="学生" value="STUDENT" />
        <el-option label="导师" value="TEACHER" />
      </el-select>
      <el-input v-model="keyword" placeholder="昵称 / openid / 手机号" style="width: 280px" clearable @clear="reload" @keyup.enter="reload" />
      <el-button type="primary" @click="reload">查询</el-button>
      <span class="muted">共 {{ total }} 条</span>
    </div>

    <el-table :data="list" v-loading="loading" border stripe row-key="id">
      <el-table-column label="ID" prop="id" width="64" />
      <el-table-column label="头像" width="70">
        <template #default="{ row }">
          <el-avatar :size="36" :src="row.avatarUrl" />
        </template>
      </el-table-column>
      <el-table-column label="昵称" prop="nickname" min-width="120" />
      <el-table-column label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'TEACHER' ? 'success' : ''" size="small">
            {{ row.role === 'TEACHER' ? '导师' : '学生' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="openid" prop="openid" min-width="200" show-overflow-tooltip />
      <el-table-column label="手机" prop="phone" width="120" />
      <el-table-column label="收藏 / 匹配" width="120">
        <template #default="{ row }">{{ row._count?.favorites || 0 }} / {{ row._count?.matchLogs || 0 }}</template>
      </el-table-column>
      <el-table-column label="导师状态" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.teacher" :type="teacherTagType(row.teacher.status)" size="small">{{ teacherStatusText(row.teacher.status) }}</el-tag>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="封禁" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.banned" type="danger" size="small">已封禁</el-tag>
          <el-tag v-else type="success" size="small">正常</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="!row.banned" size="small" type="warning" @click="openBan(row)">封禁</el-button>
          <el-button v-else size="small" type="success" @click="onUnban(row)">解封</el-button>
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

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialog.visible" title="编辑学生用户" width="420px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="昵称">
          <el-input v-model="editDialog.form.nickname" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editDialog.form.role">
            <el-option label="学生" value="STUDENT" />
            <el-option label="导师" value="TEACHER" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="editDialog.saving" @click="onSaveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 封禁对话框 -->
    <el-dialog v-model="banDialog.visible" title="封禁用户" width="420px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="原因">
          <el-input v-model="banDialog.reason" type="textarea" :rows="3" placeholder="封禁原因（必填）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="banDialog.visible = false">取消</el-button>
        <el-button type="danger" :loading="banDialog.saving" @click="onConfirmBan">确认封禁</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { endUserApi, type EndUserRole } from '@/api/admin';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const role = ref<EndUserRole | undefined>(undefined);
const loading = ref(false);

const editDialog = reactive({
  visible: false,
  saving: false,
  row: null as any,
  form: { nickname: '', role: 'STUDENT' as EndUserRole },
});

const banDialog = reactive({
  visible: false,
  saving: false,
  row: null as any,
  reason: '',
});

async function reload() {
  loading.value = true;
  try {
    const data = await endUserApi.list({
      keyword: keyword.value || undefined,
      role: role.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    list.value = data.list;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

function openEdit(row: any) {
  editDialog.row = row;
  editDialog.form = { nickname: row.nickname || '', role: row.role };
  editDialog.visible = true;
}

async function onSaveEdit() {
  editDialog.saving = true;
  try {
    await endUserApi.update(editDialog.row.id, editDialog.form);
    ElMessage.success('已保存');
    editDialog.visible = false;
    reload();
  } finally {
    editDialog.saving = false;
  }
}

function openBan(row: any) {
  banDialog.row = row;
  banDialog.reason = '';
  banDialog.visible = true;
}

async function onConfirmBan() {
  if (!banDialog.reason.trim()) {
    ElMessage.warning('请填写封禁原因');
    return;
  }
  banDialog.saving = true;
  try {
    await endUserApi.update(banDialog.row.id, { banned: true, bannedReason: banDialog.reason });
    ElMessage.success('已封禁');
    banDialog.visible = false;
    reload();
  } finally {
    banDialog.saving = false;
  }
}

async function onUnban(row: any) {
  await ElMessageBox.confirm(`确定解封「${row.nickname}」？`, '提示');
  try {
    await endUserApi.update(row.id, { banned: false });
    ElMessage.success('已解封');
    reload();
  } catch { /* interceptor */ }
}

async function onDelete(row: any) {
  await ElMessageBox.confirm(
    `永久删除「${row.nickname || row.openid}」？将同时删除该用户的所有关联数据（导师资料 / 收藏 / 匹配日志），不可恢复`,
    '危险操作',
    { type: 'error', confirmButtonText: '确定删除' },
  );
  try {
    await endUserApi.remove(row.id);
    ElMessage.success('已删除');
    reload();
  } catch { /* interceptor */ }
}

function teacherStatusText(s: string) {
  return ({ DRAFT: '草稿', PENDING: '待审核', APPROVED: '已上架', REJECTED: '已驳回', OFFLINE: '已下架' } as Record<string, string>)[s] || s;
}
function teacherTagType(s: string) {
  return ({ APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger', OFFLINE: 'info', DRAFT: '' } as Record<string, any>)[s];
}
function formatDate(s?: string) {
  return s ? new Date(s).toLocaleString() : '-';
}

onMounted(reload);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.muted { color: #9ca3af; font-size: 12px; }
.pagination { margin-top: 16px; text-align: right; }
</style>
