<template>
  <el-drawer
    v-model="visibleProxy"
    :title="teacherId ? '编辑导师' : '手动新建导师'"
    size="720px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" v-loading="loading">
      <el-divider content-position="left">基础信息</el-divider>
      <el-form-item label="头像">
        <el-upload
          class="avatar-uploader"
          :action="uploadUrl"
          :headers="uploadHeaders"
          :show-file-list="false"
          accept="image/png,image/jpeg,image/webp"
          :before-upload="beforeAvatarUpload"
          :on-success="onAvatarSuccess"
          :on-error="onAvatarError"
        >
          <img v-if="form.avatarUrl" :src="form.avatarUrl" class="avatar-img" />
          <div v-else class="avatar-empty">
            <el-icon><Plus /></el-icon>
            <span>上传头像</span>
          </div>
        </el-upload>
        <el-input v-model="form.avatarUrl" placeholder="或直接粘贴 URL" style="max-width: 420px; margin-top: 8px" clearable />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="form.nickname" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="MBTI"><el-input v-model="form.mbti" maxlength="8" /></el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="性别">
            <el-select v-model="form.gender">
              <el-option label="女" value="FEMALE" />
              <el-option label="男" value="MALE" />
              <el-option label="未知" value="UNKNOWN" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="8"><el-form-item label="国家"><el-input v-model="form.country" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="城市"><el-input v-model="form.city" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item></el-col>
      </el-row>
      <el-form-item label="自填粗略地址"><el-input v-model="form.address" /></el-form-item>

      <el-divider content-position="left">身份认证</el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="真实姓名"><el-input v-model="form.realName" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="详细地址（chooseLocation 返）"><el-input v-model="form.addressDetail" /></el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="纬度"><el-input-number v-model="form.latitude" :precision="7" :step="0.0001" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="经度"><el-input-number v-model="form.longitude" :precision="7" :step="0.0001" /></el-form-item></el-col>
      </el-row>

      <el-divider content-position="left">报价与状态</el-divider>
      <el-row :gutter="16">
        <el-col :span="8"><el-form-item label="课时费 ¥/h"><el-input-number v-model="form.hourlyRate" :min="0" :precision="2" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="试听价 ¥/h"><el-input-number v-model="form.trialRate" :min="0" :precision="2" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="起报小时"><el-input-number v-model="form.minHours" :min="1" /></el-form-item></el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="状态">
            <el-select v-model="form.status">
              <el-option label="草稿" value="DRAFT" />
              <el-option label="待审核" value="PENDING" />
              <el-option label="已上架" value="APPROVED" />
              <el-option label="已驳回" value="REJECTED" />
              <el-option label="已下架" value="OFFLINE" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8"><el-form-item label="已认证"><el-switch v-model="form.isCertified" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="排序权重"><el-input-number v-model="form.sortWeight" :min="0" /></el-form-item></el-col>
      </el-row>

      <el-divider content-position="left">展示信息</el-divider>
      <el-form-item label="教龄（年）"><el-input-number v-model="form.teachingYears" :min="0" /></el-form-item>
      <el-form-item label="授课语言（用回车分隔多个）">
        <el-input v-model="languagesText" type="textarea" :rows="2" placeholder="每行一个，如：中文 / 英文" />
      </el-form-item>
      <el-form-item label="标签（用回车分隔多个）">
        <el-input v-model="tagsText" type="textarea" :rows="2" placeholder="每行一个，如：INTJ / 05后老师" />
      </el-form-item>
      <el-form-item label="主页要点（每行一条）">
        <el-input v-model="headlinesText" type="textarea" :rows="3" placeholder="每行一条要点" />
      </el-form-item>
      <el-form-item label="指导经验"><el-input v-model="form.mentorExperience" type="textarea" :rows="2" /></el-form-item>
      <el-form-item label="工作履历"><el-input v-model="form.workHistory" type="textarea" :rows="2" /></el-form-item>
      <el-form-item label="个人荣誉"><el-input v-model="form.honors" type="textarea" :rows="2" /></el-form-item>

      <el-divider content-position="left">教育背景（覆盖式保存）</el-divider>
      <div v-for="(edu, idx) in educations" :key="idx" class="sub-row">
        <el-select v-model="edu.universityId" placeholder="选择大学" filterable style="width: 240px">
          <el-option v-for="u in universities" :key="u.id" :label="`${u.nameZh}（${u.nameEn}）`" :value="u.id" />
        </el-select>
        <el-select v-model="edu.degree" placeholder="学位" style="width: 100px">
          <el-option label="本科" value="BACHELOR" />
          <el-option label="硕士" value="MASTER" />
          <el-option label="博士" value="PHD" />
          <el-option label="其他" value="OTHER" />
        </el-select>
        <el-input v-model="edu.major" placeholder="专业" style="width: 160px" />
        <el-input-number v-model="edu.startYear" placeholder="入学年" :min="1950" :max="2099" :controls="false" style="width: 100px" />
        <el-input-number v-model="edu.endYear" placeholder="毕业年" :min="1950" :max="2099" :controls="false" style="width: 100px" />
        <el-button size="small" type="danger" link @click="educations.splice(idx, 1)">删除</el-button>
      </div>
      <el-button size="small" @click="addEducation">+ 添加学历</el-button>

      <el-divider content-position="left">辅导内容（覆盖式保存）</el-divider>
      <div v-for="(s, idx) in subjects" :key="idx" class="sub-row">
        <el-select v-model="s.subjectId" placeholder="科目" style="width: 140px">
          <el-option v-for="sub in subjectList" :key="sub.id" :label="sub.name" :value="sub.id" />
        </el-select>
        <el-select v-model="s.curriculumIds" multiple placeholder="课程体系（可多选）" style="width: 340px">
          <el-option v-for="c in curriculums" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button size="small" type="danger" link @click="subjects.splice(idx, 1)">删除</el-button>
      </div>
      <el-button size="small" @click="addSubject">+ 添加科目</el-button>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSubmit">保存</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type UploadProps } from 'element-plus';
import { teacherApi, dictApi } from '@/api/admin';
import { tokenStore } from '@/api/http';

const props = defineProps<{
  visible: boolean;
  teacherId: number | null;
}>();
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'saved'): void;
}>();

const visibleProxy = computed<boolean>({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});

const formRef = ref<FormInstance>();
const loading = ref(false);
const saving = ref(false);

const blankForm = () => ({
  nickname: '',
  avatarUrl: '',
  mbti: '',
  address: '',
  phone: '',
  gender: 'UNKNOWN',
  country: '',
  city: '',
  teachingYears: 0,
  mentorExperience: '',
  workHistory: '',
  honors: '',
  hourlyRate: 0,
  trialRate: 0,
  minHours: 1,
  status: 'DRAFT',
  isCertified: false,
  sortWeight: 0,
  realName: '',
  addressDetail: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
});
const form = reactive<ReturnType<typeof blankForm>>(blankForm());
const languagesText = ref('');
const tagsText = ref('');
const headlinesText = ref('');
const educations = ref<Array<{ universityId?: number; degree?: string; major?: string; startYear?: number; endYear?: number }>>([]);
const subjects = ref<Array<{ subjectId?: number; curriculumIds: number[] }>>([]);

const rules = {
  nickname: [{ required: true, message: '请输入昵称' }],
};

const universities = ref<any[]>([]);
const subjectList = ref<any[]>([]);
const curriculums = ref<any[]>([]);

async function loadDict() {
  const [uniRes, subj, curri] = await Promise.all([
    dictApi.universities.list({ pageSize: 200, page: 1 }),
    dictApi.subjects.list(),
    dictApi.curriculums.list(),
  ]);
  universities.value = uniRes.list;
  subjectList.value = subj;
  curriculums.value = curri;
}

async function loadTeacher(id: number) {
  loading.value = true;
  try {
    const t = await teacherApi.detail(id);
    Object.assign(form, blankForm(), {
      nickname: t.user?.nickname || '',
      avatarUrl: t.user?.avatarUrl || '',
      mbti: t.user?.mbti || '',
      address: t.user?.address || '',
      phone: t.user?.phone || '',
      gender: t.gender || 'UNKNOWN',
      country: t.country || '',
      city: t.city || '',
      teachingYears: t.teachingYears || 0,
      mentorExperience: t.mentorExperience || '',
      workHistory: t.workHistory || '',
      honors: t.honors || '',
      hourlyRate: Number(t.hourlyRate || 0),
      trialRate: Number(t.trialRate || 0),
      minHours: t.minHours || 1,
      status: t.status,
      isCertified: !!t.isCertified,
      sortWeight: t.sortWeight || 0,
      realName: t.realName || '',
      addressDetail: t.addressDetail || '',
      latitude: t.latitude !== null && t.latitude !== undefined ? Number(t.latitude) : undefined,
      longitude: t.longitude !== null && t.longitude !== undefined ? Number(t.longitude) : undefined,
    });
    languagesText.value = (Array.isArray(t.languages) ? t.languages : []).join('\n');
    tagsText.value = (Array.isArray(t.tags) ? t.tags : []).join('\n');
    headlinesText.value = (Array.isArray(t.headlines) ? t.headlines : []).join('\n');
    educations.value = (t.educations || []).map((e: any) => ({
      universityId: e.universityId,
      degree: e.degree,
      major: e.major,
      startYear: e.startYear || undefined,
      endYear: e.endYear || undefined,
    }));
    subjects.value = (t.subjects || []).map((s: any) => ({
      subjectId: s.subjectId,
      curriculumIds: (s.curriculums || []).map((c: any) => c.curriculumId),
    }));
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    if (universities.value.length === 0) await loadDict();
    if (props.teacherId) {
      await loadTeacher(props.teacherId);
    } else {
      Object.assign(form, blankForm());
      languagesText.value = '';
      tagsText.value = '';
      headlinesText.value = '';
      educations.value = [];
      subjects.value = [];
    }
  },
);

// ===== 头像上传 =====
const uploadUrl = '/api/upload/image';
const uploadHeaders = computed(() => {
  const t = tokenStore.get();
  return t ? { Authorization: `Bearer ${t}` } : {};
});

const beforeAvatarUpload: UploadProps['beforeUpload'] = (file) => {
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片需小于 5MB');
    return false;
  }
  return true;
};
const onAvatarSuccess: UploadProps['onSuccess'] = (resp) => {
  // 后端返回 { code: 0, data: { url, filename, size } }
  const data = (resp && resp.code === 0 && resp.data) || resp;
  if (data && data.url) {
    form.avatarUrl = data.url;
    ElMessage.success('头像已上传');
  } else {
    ElMessage.error('上传响应异常');
  }
};
const onAvatarError: UploadProps['onError'] = (err) => {
  console.error('[avatar] upload fail', err);
  ElMessage.error('上传失败');
};

function addEducation() {
  educations.value.push({ degree: 'BACHELOR' });
}
function addSubject() {
  subjects.value.push({ curriculumIds: [] });
}

function splitLines(text: string) {
  return text.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean);
}

async function onSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      const payload = {
        ...form,
        languages: splitLines(languagesText.value),
        tags: splitLines(tagsText.value),
        headlines: splitLines(headlinesText.value),
        educations: educations.value
          .filter((e) => e.universityId && e.major)
          .map((e) => ({
            universityId: e.universityId!,
            degree: e.degree || 'BACHELOR',
            major: e.major!,
            startYear: e.startYear,
            endYear: e.endYear,
          })),
        subjects: subjects.value
          .filter((s) => s.subjectId)
          .map((s) => ({ subjectId: s.subjectId!, curriculumIds: s.curriculumIds || [] })),
      };
      if (props.teacherId) {
        await teacherApi.update(props.teacherId, payload);
        ElMessage.success('已更新');
      } else {
        await teacherApi.create(payload);
        ElMessage.success('已新建');
      }
      visibleProxy.value = false;
      emit('saved');
    } finally {
      saving.value = false;
    }
  });
}
</script>

<style scoped>
.sub-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }

.avatar-uploader :deep(.el-upload) {
  border: 1px dashed #d1d5db;
  border-radius: 12px;
  cursor: pointer;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f9fafb;
  transition: border-color 0.2s;
}
.avatar-uploader :deep(.el-upload:hover) { border-color: #1f2937; }
.avatar-img { width: 96px; height: 96px; object-fit: cover; }
.avatar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #9ca3af;
  font-size: 12px;
}
</style>
