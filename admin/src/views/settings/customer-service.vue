<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>客服设置</span>
        <a class="muted" href="https://developers.weixin.qq.com/miniprogram/dev/api/custommsg/wx.openCustomerServiceChat.html" target="_blank">wx.openCustomerServiceChat 文档 →</a>
      </div>
    </template>

    <el-alert type="info" :closable="false" style="margin-bottom: 16px">
      <p>小程序「帮我匹配 / 帮我对接老师 / 联系客服」入口统一使用企业微信客服。</p>
      <ul>
        <li><b>客服链接</b>：企业微信客服后台生成，形如 <code>https://work.weixin.qq.com/kfid/xxx</code></li>
        <li><b>企业 corpId</b>：企业微信管理后台 →「我的企业 → 企业信息 → 企业ID」；<b>必填</b>，否则小程序无法唤起客服</li>
        <li>还需在 <b>小程序管理后台 →「客服」</b> 绑定该企业微信客服，绑定后 wx.openCustomerServiceChat 才生效</li>
      </ul>
    </el-alert>

    <el-form :model="form" label-width="120px" label-position="left" @submit.prevent="onSave">
      <el-form-item label="启用">
        <el-switch v-model="form.active" />
        <span class="muted" style="margin-left: 12px">关闭后客服入口会提示"暂未开放"</span>
      </el-form-item>
      <el-form-item label="客服链接">
        <el-input v-model="form.url" placeholder="https://work.weixin.qq.com/kfid/xxx" />
      </el-form-item>
      <el-form-item label="企业 corpId">
        <el-input v-model="form.corpId" placeholder="ww 或 wx 开头的企业ID" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { systemConfigApi } from '@/api/admin';

const KEY = 'customer-service';
const loading = ref(false);
const saving = ref(false);
const form = reactive({
  active: true,
  url: '',
  corpId: '',
});

async function load() {
  loading.value = true;
  try {
    const row = await systemConfigApi.get(KEY);
    if (row && row.value) {
      try {
        const parsed = JSON.parse(row.value);
        Object.assign(form, {
          active: parsed.active !== false,
          url: parsed.url || '',
          corpId: parsed.corpId || '',
        });
      } catch (err) {
        console.warn('[customer-service] parse fail', err);
      }
    }
  } finally {
    loading.value = false;
  }
}

async function onSave() {
  saving.value = true;
  try {
    await systemConfigApi.upsert(KEY, JSON.stringify(form), '企业微信客服配置');
    ElMessage.success('已保存');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.muted { color: #9ca3af; font-size: 12px; }
.muted a, a.muted { text-decoration: none; }
ul { margin: 8px 0 0 16px; padding-left: 16px; line-height: 1.8; }
</style>
