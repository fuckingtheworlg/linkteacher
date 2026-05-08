/* eslint-disable no-console */
import { PrismaClient, AdminRole, BannerPosition } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SUBJECTS: Array<{ code: string; name: string; sort: number }> = [
  { code: 'math', name: '数学', sort: 10 },
  { code: 'physics', name: '物理', sort: 20 },
  { code: 'chemistry', name: '化学', sort: 30 },
  { code: 'biology', name: '生物', sort: 40 },
  { code: 'english', name: '英语', sort: 50 },
  { code: 'economics', name: '经济', sort: 60 },
  { code: 'cs', name: '计算机', sort: 70 },
  { code: 'business', name: '商务', sort: 80 },
  { code: 'history', name: '历史', sort: 90 },
  { code: 'geography', name: '地理', sort: 100 },
];

const CURRICULUMS: Array<{ code: string; name: string; sort: number }> = [
  { code: 'igcse', name: 'iGCSE', sort: 10 },
  { code: 'alevel-caie', name: 'ALevel-CAIE', sort: 20 },
  { code: 'alevel-edexcel', name: 'ALevel-爱德思', sort: 30 },
  { code: 'alevel-aqa', name: 'ALevel-AQA', sort: 40 },
  { code: 'ib-hl', name: 'IB-HL', sort: 50 },
  { code: 'ib-sl', name: 'IB-SL', sort: 60 },
  { code: 'ap', name: 'AP', sort: 70 },
];

// 英国 + 美国 + 中国港澳 部分高频名校（QS 2025 / 2024 公开数据，便于后台维护时检索）
const UNIVERSITIES = [
  { nameEn: 'University of Oxford', nameZh: '牛津大学', country: '英国', city: '牛津', qsRank: 3, qsYear: 2025 },
  { nameEn: 'University of Cambridge', nameZh: '剑桥大学', country: '英国', city: '剑桥', qsRank: 5, qsYear: 2025 },
  { nameEn: 'Imperial College London', nameZh: '帝国理工学院', country: '英国', city: '伦敦', qsRank: 2, qsYear: 2025 },
  { nameEn: 'University College London', nameZh: '伦敦大学学院', country: '英国', city: '伦敦', qsRank: 9, qsYear: 2025 },
  { nameEn: 'King\'s College London', nameZh: '伦敦国王学院', country: '英国', city: '伦敦', qsRank: 40, qsYear: 2025 },
  { nameEn: 'London School of Economics and Political Science', nameZh: '伦敦政治经济学院', country: '英国', city: '伦敦', qsRank: 50, qsYear: 2025 },
  { nameEn: 'University of Edinburgh', nameZh: '爱丁堡大学', country: '英国', city: '爱丁堡', qsRank: 27, qsYear: 2025 },
  { nameEn: 'University of Manchester', nameZh: '曼彻斯特大学', country: '英国', city: '曼彻斯特', qsRank: 34, qsYear: 2025 },
  { nameEn: 'University of Bristol', nameZh: '布里斯托大学', country: '英国', city: '布里斯托', qsRank: 54, qsYear: 2025 },
  { nameEn: 'University of Warwick', nameZh: '华威大学', country: '英国', city: '考文垂', qsRank: 69, qsYear: 2025 },
  { nameEn: 'University of Glasgow', nameZh: '格拉斯哥大学', country: '英国', city: '格拉斯哥', qsRank: 78, qsYear: 2025 },
  { nameEn: 'University of Birmingham', nameZh: '伯明翰大学', country: '英国', city: '伯明翰', qsRank: 80, qsYear: 2025 },
  { nameEn: 'University of Southampton', nameZh: '南安普顿大学', country: '英国', city: '南安普顿', qsRank: 81, qsYear: 2025 },
  { nameEn: 'University of Leeds', nameZh: '利兹大学', country: '英国', city: '利兹', qsRank: 82, qsYear: 2025 },
  { nameEn: 'University of Sheffield', nameZh: '谢菲尔德大学', country: '英国', city: '谢菲尔德', qsRank: 105, qsYear: 2025 },
  { nameEn: 'Durham University', nameZh: '杜伦大学', country: '英国', city: '杜伦', qsRank: 92, qsYear: 2025 },
  { nameEn: 'University of Nottingham', nameZh: '诺丁汉大学', country: '英国', city: '诺丁汉', qsRank: 108, qsYear: 2025 },
  { nameEn: 'University of St Andrews', nameZh: '圣安德鲁斯大学', country: '英国', city: '圣安德鲁斯', qsRank: 95, qsYear: 2025 },
  { nameEn: 'Massachusetts Institute of Technology', nameZh: '麻省理工学院', country: '美国', city: '剑桥(MA)', qsRank: 1, qsYear: 2025 },
  { nameEn: 'Harvard University', nameZh: '哈佛大学', country: '美国', city: '剑桥(MA)', qsRank: 4, qsYear: 2025 },
  { nameEn: 'Stanford University', nameZh: '斯坦福大学', country: '美国', city: '斯坦福', qsRank: 6, qsYear: 2025 },
  { nameEn: 'University of California, Berkeley', nameZh: '加州大学伯克利分校', country: '美国', city: '伯克利', qsRank: 12, qsYear: 2025 },
  { nameEn: 'University of Hong Kong', nameZh: '香港大学', country: '中国香港', city: '香港', qsRank: 17, qsYear: 2025 },
  { nameEn: 'The Hong Kong University of Science and Technology', nameZh: '香港科技大学', country: '中国香港', city: '香港', qsRank: 47, qsYear: 2025 },
];

async function main() {
  console.log('--- Seed: subjects ---');
  for (const s of SUBJECTS) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, sort: s.sort },
      create: s,
    });
  }

  console.log('--- Seed: curriculums ---');
  for (const c of CURRICULUMS) {
    await prisma.curriculum.upsert({
      where: { code: c.code },
      update: { name: c.name, sort: c.sort },
      create: c,
    });
  }

  console.log('--- Seed: universities ---');
  for (const u of UNIVERSITIES) {
    await prisma.university.upsert({
      where: { nameEn_country: { nameEn: u.nameEn, country: u.country } },
      update: { nameZh: u.nameZh, city: u.city, qsRank: u.qsRank, qsYear: u.qsYear },
      create: u,
    });
  }

  console.log('--- Seed: default admin ---');
  const username = 'admin';
  const defaultPassword = 'Admin@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  await prisma.adminUser.upsert({
    where: { username },
    update: {},
    create: {
      username,
      passwordHash,
      name: '超级管理员',
      role: AdminRole.SUPER_ADMIN,
      mustChangePwd: true,
    },
  });
  console.log(`   admin account: ${username} / ${defaultPassword} (must change on first login)`);

  console.log('--- Seed: home banner (CTB) ---');
  const existingBanner = await prisma.banner.findFirst({
    where: { position: BannerPosition.HOME_TOP, title: '国际竞赛 COMPETITIONS' },
  });
  if (!existingBanner) {
    await prisma.banner.create({
      data: {
        title: '国际竞赛 COMPETITIONS',
        subtitle: 'CTB 查看列表',
        imageUrl: '',
        link: '',
        position: BannerPosition.HOME_TOP,
        sort: 1,
        active: true,
      },
    });
  }

  console.log('--- Seed: done ---');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
