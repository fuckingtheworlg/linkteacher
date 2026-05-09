<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索昵称 / 手机号 / openid" style="width: 280px" clearable @clear="reload" @keyup.enter="reload" />
        <el-button type="primary" @click="reload">查询</el-button>
        <span class="muted">共 {{ total }} 条</span>
      </div>

      <el-table :data="list" v-loading="loading" border stripe row-key="id">
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :size="40" :src="row.user?.avatarUrl" />
          </template>
        </el-table-column>
        <el-table-column label="昵称" prop="user.nickname" min-width="120" />
        <el-table-column label="性别" width="70">
          <template #default="{ row }">
            <el-tag size="small" v-if="row.gender === 'MALE'">男</el-tag>
            <el-tag size="small" type="danger" v-else-if="row.gender === 'FEMALE'">女</el-tag>
            <el-tag size="small" type="info" v-else>未知</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所在地" min-width="140">
          <template #default="{ row }">{{ [row.country, row.city].filter(Boolean).join(' · ') || '-' }}</template>
        </el-table-column>
        <el-table-column label="科目" min-width="220">
          <template #default="{ row }">
            <el-tag v-for="ts in row.subjects" :key="ts.id" size="small" style="margin-right:6px">{{ ts.subject?.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="课时费" width="100">
          <template #default="{ row }">¥{{ row.hourlyRate || '-' }}/h</template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">{{ formatDate(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openAudit(row)">审核</el-button>
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

    <el-drawer v-model="drawer.visible" title="导师资料审核" size="640px" destroy-on-close>
      <div v-if="drawer.teacher" class="teacher-detail">
        <el-descriptions :column="2" border title="基础信息">
          <el-descriptions-item label="昵称">{{ drawer.teacher.user?.nickname }}</el-descriptions-item>
          <el-descriptions-item label="MBTI">{{ drawer.teacher.user?.mbti || '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ drawer.teacher.user?.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ drawer.teacher.gender }}</el-descriptions-item>
          <el-descriptions-item label="所在地">{{ [drawer.teacher.country, drawer.teacher.city].filter(Boolean).join(' · ') }}</el-descriptions-item>
          <el-descriptions-item label="教龄">{{ drawer.teacher.teachingYears || 0 }} 年</el-descriptions-item>
          <el-descriptions-item label="授课语言">{{ formatJsonArr(drawer.teacher.languages) }}</el-descriptions-item>
          <el-descriptions-item label="标签">{{ formatJsonArr(drawer.teacher.tags) }}</el-descriptions-item>
        </el-descriptions>

        <el-descriptions :column="2" border title="报价" class="mt">
          <el-descriptions-item label="课时费">¥{{ drawer.teacher.hourlyRate || '-' }} / h</el-descriptions-item>
          <el-descriptions-item label="试听价">¥{{ drawer.teacher.trialRate || '-' }} / h</el-descriptions-item>
          <el-descriptions-item label="起报小时">{{ drawer.teacher.minHours || 1 }}</el-descriptions-item>
        </el-descriptions>

        <h4 class="mt">教育背景</h4>
        <el-table :data="drawer.teacher.educations || []" size="small" border>
          <el-table-column label="学校" prop="university.nameZh" />
          <el-table-column label="学位" prop="degree" width="100" />
          <el-table-column label="专业" prop="major" />
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ row.startYear || '?' }} - {{ row.endYear || '?' }}</template>
          </el-table-column>
        </el-table>

        <h4 class="mt">辅导内容</h4>
        <el-table :data="drawer.teacher.subjects || []" size="small" border>
          <el-table-column label="科目" prop="subject.name" />
          <el-table-column label="课程体系">
            <template #default="{ row }">
              <el-tag v-for="c in row.curriculums" :key="c.id" size="small" style="margin:2px">
                {{ c.curriculum?.name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="备注" prop="note" />
        </el-table>

        <h4 class="mt">主页要点 / 工作履历 / 个人荣誉</h4>
        <pre class="long-text">{{ formatHeadlines(drawer.teacher.headlines) }}</pre>
        <pre class="long-text" v-if="drawer.teacher.workHistory">工作履历：{{ drawer.teacher.workHistory }}</pre>
        <pre class="long-text" v-if="drawer.teacher.honors">个人荣誉：{{ drawer.teacher.honors }}</pre>

        <h4 class="mt">简历（PDF）</h4>
        <div v-if="drawer.teacher.resumeUrl" class="resume-block">
          <div class="resume-row">
            <el-link type="primary" :href="drawer.teacher.resumeUrl" target="_blank" :underline="false">
              📄 {{ drawer.teacher.resumeFilename || '查看简历' }}
            </el-link>
            <el-tag :type="resumeTagType(drawer.teacher.resumeStatus)" size="small">
              {{ resumeStatusText(drawer.teacher.resumeStatus) }}
            </el-tag>
            <el-tag v-if="drawer.teacher.resumeAllowDisplay" type="success" size="small">同意展示</el-tag>
            <el-tag v-else type="info" size="small">不同意展示</el-tag>
          </div>
          <div class="muted resume-meta">
            <span v-if="drawer.teacher.resumeUploadedAt">
              上传：{{ formatDate(drawer.teacher.resumeUploadedAt) }}
            </span>
            <span v-if="drawer.teacher.resumeReviewedAt" style="margin-left: 12px">
              审核：{{ formatDate(drawer.teacher.resumeReviewedAt) }}
            </span>
          </div>
          <div v-if="drawer.teacher.resumeStatus === 'REJECTED' && drawer.teacher.resumeRejectReason" class="resume-reject">
            驳回原因：{{ drawer.teacher.resumeRejectReason }}
          </div>

          <div class="resume-actions">
            <el-input
              v-model="drawer.resumeReason"
              size="small"
              placeholder="驳回原因（仅驳回时必填）"
              style="max-width: 320px; margin-right: 8px"
            />
            <el-button
              size="small"
              type="success"
              :disabled="drawer.teacher.resumeStatus === 'APPROVED'"
              :loading="drawer.resumeSaving"
              @click="onAuditResume(true)"
            >通过简历</el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="drawer.teacher.resumeStatus === 'REJECTED'"
              :loading="drawer.resumeSaving"
              @click="onAuditResume(false)"
            >驳回简历</el-button>
          </div>
        </div>
        <div v-else class="muted">未上传简历</div>
      </div>

      <template #footer>
        <el-input
          v-model="drawer.reason"
          type="textarea"
          :rows="2"
          placeholder="如驳回，请填写原因（导师端可见）"
          style="margin-bottom: 12px"
        />
        <el-button :loading="drawer.saving" @click="onAudit(false)">驳回</el-button>
        <el-button type="primary" :loading="drawer.saving" @click="onAudit(true)">通过</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { teacherApi } from '@/api/admin';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref('');
const loading = ref(false);

const drawer = reactive({
  visible: false,
  teacher: null as any,
  reason: '',
  saving: false,
  resumeReason: '',
  resumeSaving: false,
});

async function reload() {
  loading.value = true;
  try {
    const data = await teacherApi.list({
      status: 'PENDING',
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

async function openAudit(row: any) {
  try {
    const detail = await teacherApi.detail(row.id);
    drawer.teacher = detail;
    drawer.reason = '';
    drawer.resumeReason = '';
    drawer.visible = true;
  } catch { /* interceptor */ }
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

async function onAuditResume(approve: boolean) {
  if (!drawer.teacher) return;
  if (!approve && !drawer.resumeReason.trim()) {
    ElMessage.warning('驳回简历必须填写原因');
    return;
  }
  drawer.resumeSaving = true;
  try {
    const updated = await teacherApi.auditResume(drawer.teacher.id, approve, drawer.resumeReason);
    drawer.teacher = { ...drawer.teacher, ...updated };
    drawer.resumeReason = '';
    ElMessage.success(approve ? '简历已通过' : '简历已驳回');
  } finally {
    drawer.resumeSaving = false;
  }
}

async function onAudit(approve: boolean) {
  if (!drawer.teacher) return;
  if (!approve) {
    if (!drawer.reason.trim()) {
      ElMessage.warning('驳回必须填写原因');
      return;
    }
    await ElMessageBox.confirm('确定驳回该导师？', '提示', { type: 'warning' }).catch(() => null).then(async (r) => {
      if (r === 'confirm') await doAudit(false);
    });
    return;
  }
  await doAudit(true);
}

async function doAudit(approve: boolean) {
  drawer.saving = true;
  try {
    await teacherApi.audit(drawer.teacher.id, approve, drawer.reason);
    ElMessage.success(approve ? '已通过审核' : '已驳回');
    drawer.visible = false;
    reload();
  } finally {
    drawer.saving = false;
  }
}

function formatJsonArr(arr: unknown) {
  if (!Array.isArray(arr) || !arr.length) return '-';
  return arr.join('，');
}
function formatHeadlines(arr: unknown) {
  if (!Array.isArray(arr) || !arr.length) return '主页要点：（暂无）';
  return '主页要点：\n' + arr.map((s) => '· ' + s).join('\n');
}
function formatDate(s?: string) {
  if (!s) return '-';
  return new Date(s).toLocaleString();
}

onMounted(reload);
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.muted { color: #9ca3af; font-size: 12px; }
.pagination { margin-top: 16px; text-align: right; }
.teacher-detail { padding-bottom: 16px; }
.mt { margin-top: 16px; }
.long-text { white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 6px; }
.resume-block { padding: 8px 0; }
.resume-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.resume-meta { font-size: 12px; margin-top: 6px; }
.resume-reject { color: #b91c1c; font-size: 13px; margin-top: 6px; background: #fef2f2; padding: 6px 10px; border-radius: 4px; border-left: 3px solid #ef4444; }
.resume-actions { margin-top: 12px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
</style>
