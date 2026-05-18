/* eslint-disable no-console */
/**
 * 测试用：创建 10 个虚拟老师
 *
 * 用法（在 ECS 上跑一次即可）：
 *   npm --workspace server exec -- ts-node --transpile-only prisma/seed-test-teachers.ts
 *
 * 幂等性：openid 形如 mock_test_teacher_<i>，重复执行不会重复创建
 *
 * 状态分布：6 APPROVED + 2 PENDING + 1 REJECTED + 1 DRAFT
 */
import { PrismaClient, TeacherStatus, Gender, DegreeType } from '@prisma/client';

const prisma = new PrismaClient();

const NAMES = [
  '陆星河', '林知行', '苏夜白', '陈宇宁', '周慕白',
  'Alex Chen', 'Bella Lin', 'Carter Wang', 'Diana Zhao', 'Ethan Liu',
];

const HEADLINES_POOL = [
  ['牛津大学数学专业一等学位', 'AMC 12 全球前 5%', '5 年 IB / A-Level 教学经验'],
  ['剑桥大学物理硕士', 'PAT 笔试 95+', '可辅导 STEP I/II/III'],
  ['帝国理工生物医学硕士', 'IGCSE 全 A*', '擅长帮学生做 PS / UCAS'],
  ['UCL 化学工程本科', 'A-Level 4A*', 'CAIE / Edexcel 体系全覆盖'],
  ['LSE 经济学硕士', 'IB 经济 7 分', '帮多名学生拿到 LSE / Warwick offer'],
  ['MIT 计算机本科', 'Codeforces Master', '可辅导竞赛与 AP CS'],
  ['哈佛历史本科', 'A-Level 历史满分', '论文方向辅导'],
  ['爱丁堡大学英语文学硕士', '雅思 8.5', '专攻 IB English A 与论文写作'],
  ['南安普顿大学数学本科', 'A-Level 4A*', '可辅导 IGCSE 数学 / 进阶数学'],
  ['布里斯托大学物理本科', '皇家物理协会奖学金获得者', '可辅导 PhysicsBowl / BPhO'],
];

const TAGS_POOL = [
  ['INTJ', '05后老师'],
  ['ENTJ', '90后导师'],
  ['INFP', '海归', '名校直系'],
  ['ESFJ', '英美双语'],
  ['ISTJ', '专业讲师'],
  ['ENFP', '帅气大男孩'],
  ['INTP', '理科学霸'],
  ['ENFJ', '亲和力满分'],
  ['ISTP', '逻辑控'],
  ['ESTP', '互动式教学'],
];

const COUNTRIES_CITIES: Array<[string, string]> = [
  ['英国', '伦敦'], ['英国', '牛津'], ['英国', '剑桥'], ['英国', '伯明翰'],
  ['英国', '曼彻斯特'], ['美国', '波士顿'], ['美国', '加州'], ['中国香港', '香港'],
  ['英国', '爱丁堡'], ['中国', '上海'],
];

const STATUS_PLAN: TeacherStatus[] = [
  'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED',
  'PENDING', 'PENDING',
  'REJECTED',
  'DRAFT',
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  console.log('--- Seed test teachers (10 个) ---');

  // 加载字典数据
  const subjects = await prisma.subject.findMany({ where: { active: true }, orderBy: { id: 'asc' } });
  const curriculums = await prisma.curriculum.findMany({ where: { active: true }, orderBy: { id: 'asc' } });
  const universities = await prisma.university.findMany({ where: { active: true }, orderBy: { qsRank: 'asc' } });

  if (!subjects.length || !curriculums.length || !universities.length) {
    throw new Error('字典数据为空，请先跑 npm run prisma:seed');
  }

  for (let i = 0; i < 10; i++) {
    const openid = `mock_test_teacher_${i + 1}`;
    const status = STATUS_PLAN[i];
    const isReady = status === 'APPROVED' || status === 'PENDING' || status === 'REJECTED';

    // upsert User
    const nickname = NAMES[i];
    const [country, city] = COUNTRIES_CITIES[i];
    const user = await prisma.user.upsert({
      where: { openid },
      update: { nickname, role: 'TEACHER' },
      create: {
        openid,
        role: 'TEACHER',
        nickname,
        mbti: pick(['INTJ', 'ENTJ', 'INFP', 'ESFJ', 'ISTJ', 'ENFP', 'INTP', 'ENFJ', 'ISTP', 'ESTP'], i),
        address: `${country} · ${city}`,
      },
    });

    // upsert Teacher
    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        gender: i % 3 === 0 ? Gender.FEMALE : Gender.MALE,
        country,
        city,
        headlines: HEADLINES_POOL[i],
        languages: i % 2 === 0 ? ['中文', '英文'] : ['中文'],
        tags: TAGS_POOL[i],
        teachingYears: 1 + (i % 6),
        mentorExperience: '辅导过 IGCSE / A-Level / IB 多届学生',
        hourlyRate: 180 + i * 20,
        trialRate: 90 + i * 10,
        minHours: 1,
        status,
        isCertified: status === 'APPROVED',
        sortWeight: status === 'APPROVED' ? 100 - i : 0,
        rejectReason: status === 'REJECTED' ? '简历照片不清晰，请补充更新' : null,
        submittedAt: isReady ? new Date(Date.now() - i * 86400000) : null,
        approvedAt: status === 'APPROVED' ? new Date(Date.now() - i * 86400000) : null,
        // 身份认证（按用户决策：测试数据填充以便后台审核能看到）
        realName: isReady ? `测试_${nickname}` : null,
      },
    });

    // 清理已有学历/科目（保证幂等）
    await prisma.teacherEducation.deleteMany({ where: { teacherId: teacher.id } });
    const oldTs = await prisma.teacherSubject.findMany({ where: { teacherId: teacher.id }, select: { id: true } });
    if (oldTs.length) {
      await prisma.teacherSubjectCurriculum.deleteMany({ where: { teacherSubjectId: { in: oldTs.map((x) => x.id) } } });
      await prisma.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
    }

    // 创建 1 段学历（APPROVED 老师的学历预设为 VERIFIED）
    const u = universities[i % universities.length];
    await prisma.teacherEducation.create({
      data: {
        teacherId: teacher.id,
        universityId: u.id,
        degree: i % 4 === 0 ? DegreeType.MASTER : DegreeType.BACHELOR,
        major: pick(['数学', '物理', '化学', '生物医学', '经济学', '计算机科学', '英语文学'], i),
        startYear: 2018 + (i % 4),
        endYear: 2022 + (i % 4),
        sort: 0,
        verifiedStatus: status === 'APPROVED' ? 'VERIFIED' : 'PENDING',
        verifiedAt: status === 'APPROVED' ? new Date() : null,
      },
    });

    // 创建 1-2 个科目，每个带 2 个课程体系
    const subjectCount = (i % 2) + 1;
    for (let s = 0; s < subjectCount; s++) {
      const subject = subjects[(i + s) % subjects.length];
      const ts = await prisma.teacherSubject.create({
        data: { teacherId: teacher.id, subjectId: subject.id },
      });
      const c1 = curriculums[(i + s) % curriculums.length];
      const c2 = curriculums[(i + s + 2) % curriculums.length];
      await prisma.teacherSubjectCurriculum.createMany({
        data: [
          { teacherSubjectId: ts.id, curriculumId: c1.id },
          { teacherSubjectId: ts.id, curriculumId: c2.id },
        ],
        skipDuplicates: true,
      });
    }

    console.log(`  [${status.padEnd(8)}] #${teacher.id} ${nickname} (${country} · ${city})`);
  }

  console.log('--- Done ---');
}

main()
  .catch((e) => {
    console.error('Seed test teachers failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
