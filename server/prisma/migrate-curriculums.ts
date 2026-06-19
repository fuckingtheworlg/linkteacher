/* eslint-disable no-console */
/**
 * 课程体系合并迁移（幂等，可重复执行）
 *
 *   ALevel-CAIE / ALevel-爱德思 / ALevel-AQA  →  A-Level
 *   IB-HL / IB-SL                              →  IB
 *   新增：竞赛
 *   最终：iGCSE / A-Level / IB / AP / 竞赛
 *
 * 用法：npm --workspace server run prisma:migrate-curriculums
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureCurriculum(code: string, name: string, sort: number) {
  return prisma.curriculum.upsert({
    where: { code },
    update: { name, sort, active: true },
    create: { code, name, sort, active: true },
  });
}

async function repoint(fromCode: string, toId: number) {
  const from = await prisma.curriculum.findUnique({ where: { code: fromCode } });
  if (!from || from.id === toId) return;

  // 把引用旧 curriculum 的关联，改指向目标 curriculum
  const links = await prisma.teacherSubjectCurriculum.findMany({ where: { curriculumId: from.id } });
  for (const link of links) {
    // 目标科目下是否已有指向 toId 的关联（避免唯一约束冲突）
    const dup = await prisma.teacherSubjectCurriculum.findFirst({
      where: { teacherSubjectId: link.teacherSubjectId, curriculumId: toId },
    });
    if (dup) {
      // 已存在 → 删掉重复的旧关联
      await prisma.teacherSubjectCurriculum.delete({ where: { id: link.id } });
    } else {
      await prisma.teacherSubjectCurriculum.update({
        where: { id: link.id },
        data: { curriculumId: toId },
      });
    }
  }
  // 旧 curriculum 现在无引用，删除
  await prisma.curriculum.delete({ where: { id: from.id } });
  console.log(`  repointed ${fromCode} -> ${toId}, removed ${fromCode}`);
}

async function main() {
  console.log('--- 课程体系合并迁移 ---');

  // 1. 确保/重命名目标项
  await ensureCurriculum('igcse', 'iGCSE', 10);
  const alevel = await ensureCurriculum('alevel', 'A-Level', 20);
  const ib = await ensureCurriculum('ib', 'IB', 30);
  await ensureCurriculum('ap', 'AP', 40);
  await ensureCurriculum('competition', '竞赛', 50);
  console.log('  target curriculums ready');

  // 2. 合并旧的 A-Level 三件套 → alevel
  await repoint('alevel-caie', alevel.id);
  await repoint('alevel-edexcel', alevel.id);
  await repoint('alevel-aqa', alevel.id);

  // 3. 合并 IB-HL / IB-SL → ib
  await repoint('ib-hl', ib.id);
  await repoint('ib-sl', ib.id);

  // 4. 最终列表
  const finalList = await prisma.curriculum.findMany({ orderBy: { sort: 'asc' } });
  console.log('--- 迁移后课程体系 ---');
  finalList.forEach((c) => console.log(`  ${c.code}\t${c.name}\t(active=${c.active})`));
  console.log('--- Done ---');
}

main()
  .catch((e) => {
    console.error('迁移失败：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
