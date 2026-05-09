<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card>
          <div class="metric-label">待审核导师</div>
          <div class="metric-value">{{ stats.pending }}</div>
          <el-link type="primary" :underline="false" @click="$router.push('/teachers/audit')">前往审核 →</el-link>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="metric-label">已上架导师</div>
          <div class="metric-value">{{ stats.approved }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="metric-label">今日匹配请求</div>
          <div class="metric-value">{{ stats.todayMatch }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="metric-label">待审简历</div>
          <div class="metric-value">{{ stats.pendingResume }}</div>
          <el-link type="primary" :underline="false" @click="$router.push('/teachers/resume-audit')">前往审核 →</el-link>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="quick-card" header="快速操作">
      <el-space wrap>
        <el-button type="primary" @click="$router.push('/teachers/audit')">导师审核</el-button>
        <el-button @click="$router.push('/teachers/list')">导师管理</el-button>
        <el-button @click="$router.push('/dict/universities')">大学库</el-button>
        <el-button @click="$router.push('/banners')">Banner 管理</el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { teacherApi, type TeacherStats } from '@/api/admin';

const stats = reactive<TeacherStats>({ pending: 0, approved: 0, todayMatch: 0, pendingResume: 0 });

async function load() {
  try {
    const data = await teacherApi.stats();
    stats.pending = data.pending;
    stats.approved = data.approved;
    stats.todayMatch = data.todayMatch;
    stats.pendingResume = data.pendingResume;
  } catch {
    // interceptor 已提示
  }
}

onMounted(load);
</script>

<style scoped>
.dashboard { padding: 8px; }
.metric-label { color: #6b7280; font-size: 14px; }
.metric-value { font-size: 28px; font-weight: 700; color: #1f2937; margin: 8px 0; }
.metric-sub { color: #9ca3af; font-size: 12px; }
.status-ok { color: #16a34a; font-size: 18px; }
.quick-card { margin-top: 16px; }
</style>
