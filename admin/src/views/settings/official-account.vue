<template>
  <el-card v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>公众号设置</span>
        <a class="muted" href="https://developers.weixin.qq.com/miniprogram/dev/component/official-account.html" target="_blank">微信 official-account 组件文档 →</a>
      </div>
    </template>

    <el-alert type="info" :closable="false" style="margin-bottom: 16px">
      <p>本配置由小程序「我的」页公众号引导卡读取：</p>
      <ul>
        <li><b>同主体</b>勾选时，小程序使用微信原生 <code>&lt;official-account&gt;</code> 组件，用户可一键关注。要求小程序与公众号在公众平台后台已勾选「关联微信小程序」。</li>
        <li><b>未勾选同主体</b>时，小程序显示「长按识别二维码」引导关注（请上传方形二维码图）。</li>
      </ul>
    </el-alert>

    <el-form :model="form" label-width="120px" label-position="left" @submit.prevent="onSave">
      <el-form-item label="启用">
        <el-switch v-model="form.active" />
        <span class="muted" style="margin-left: 12px">关闭后小程序「我的」页不再展示公众号卡片</span>
      </el-form-item>
      <el-form-item label="公众号名称">
        <el-input v-model="form.name" maxlength="32" />
      </el-form-item>
      <el-form-item label="副标题描述">
        <el-input v-model="form.desc" maxlength="64" />
      </el-form-item>
      <el-form-item label="同主体">
        <el-switch v-model="form.sameSubject" />
        <span class="muted" style="margin-left: 12px">小程序与公众号是同一企业/个人主体；勾选后用一键关注组件</span>
      </el-form-item>

      <template v-if="form.sameSubject">
        <el-form-item label="公众号 AppID">
          <el-input v-model="form.mpAppId" placeholder="wx 开头的公众号 AppID" />
        </el-form-item>
        <el-alert type="success" :closable="false">
          ✓ 同主体模式：除上面填的公众号 AppID 外，还需要：
          <ol>
            <li>到 <a href="https://mp.weixin.qq.com" target="_blank">微信公众号后台</a> →「设置 → 关联小程序」添加本小程序</li>
            <li>到「小程序后台 → 设置 → 关联公众号」反向关联</li>
            <li>在 app.json 的 plugin / official-account 配置中无需额外动作（组件已就绪）</li>
          </ol>
        </el-alert>
      </template>

      <template v-else>
        <el-form-item label="二维码图片 URL">
          <div class="qr-block">
            <el-image v-if="form.qrcodeUrl" :src="form.qrcodeUrl" :preview-src-list="[form.qrcodeUrl]" style="width: 160px; height: 160px; border-radius: 8px; border: 1px solid #f3f4f6" fit="cover" />
            <div v-else class="qr-empty">未上传</div>
            <div class="qr-actions">
              <el-input v-model="form.qrcodeUrl" placeholder="直接粘贴二维码图片 URL" style="margin-bottom: 8px" />
              <el-upload
                :action="uploadUrl"
                :headers="uploadHeaders"
                :show-file-list="false"
                accept="image/png,image/jpeg,image/webp"
                :before-upload="beforeQrUpload"
                :on-success="onQrSuccess"
              >
                <el-button>上传图片</el-button>
              </el-upload>
            </div>
          </div>
        </el-form-item>
      </template>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, type UploadProps } from 'element-plus';
import { systemConfigApi } from '@/api/admin';
import { tokenStore } from '@/api/http';

const KEY = 'official-account';

const loading = ref(false);
const saving = ref(false);
const form = reactive({
  active: true,
  name: '',
  desc: '',
  sameSubject: false,
  mpAppId: '',
  qrcodeUrl: '',
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
          name: parsed.name || '',
          desc: parsed.desc || '',
          sameSubject: !!parsed.sameSubject,
          mpAppId: parsed.mpAppId || '',
          qrcodeUrl: parsed.qrcodeUrl || '',
        });
      } catch (err) {
        console.warn('[official-account] parse fail, using defaults', err);
      }
    }
  } finally {
    loading.value = false;
  }
}

async function onSave() {
  saving.value = true;
  try {
    await systemConfigApi.upsert(KEY, JSON.stringify(form), '公众号引导卡配置');
    ElMessage.success('已保存');
  } finally {
    saving.value = false;
  }
}

// 图片上传
const uploadUrl = '/api/upload/image';
const uploadHeaders = computed(() => {
  const t = tokenStore.get();
  return t ? { Authorization: `Bearer ${t}` } : {};
});
const beforeQrUpload: UploadProps['beforeUpload'] = (file) => {
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片需小于 5MB');
    return false;
  }
  return true;
};
const onQrSuccess: UploadProps['onSuccess'] = (resp) => {
  const data = (resp && resp.code === 0 && resp.data) || resp;
  if (data && data.url) {
    form.qrcodeUrl = data.url;
    ElMessage.success('二维码已上传');
  }
};

onMounted(load);
</script>

<style scoped>
.card-header { display: flex; align-items: center; justify-content: space-between; }
.muted { color: #9ca3af; font-size: 12px; }
.muted a, a.muted { text-decoration: none; }
ul { margin: 8px 0 0 16px; padding-left: 16px; }
ol { margin: 8px 0 0 16px; padding-left: 16px; }
.qr-block { display: flex; gap: 16px; align-items: flex-start; }
.qr-empty {
  width: 160px;
  height: 160px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 12px;
}
.qr-actions { flex: 1; }
</style>
