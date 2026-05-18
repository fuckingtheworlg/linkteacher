/* eslint-disable no-console */
/**
 * 批量灌入 QS 2025 World University Rankings Top 100
 *
 * 用法：
 *   npm --workspace server run prisma:seed-universities
 *
 * 幂等性：
 *   - 唯一约束 [nameEn, country]，重复执行不会创建重复记录
 *   - 已存在的学校：仅更新 qsRank / qsYear / nameZh / city（不动 logoUrl，
 *     保留后台运营可能手动上传的校徽）
 *   - 不存在的学校：完整创建
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UniRow {
  nameEn: string;
  nameZh: string;
  country: string;
  city: string;
  qsRank: number;
}

const QS2025: UniRow[] = [
  { nameEn: 'Massachusetts Institute of Technology',        nameZh: '麻省理工学院',          country: '美国',     city: '剑桥(MA)',  qsRank: 1 },
  { nameEn: 'Imperial College London',                       nameZh: '帝国理工学院',          country: '英国',     city: '伦敦',      qsRank: 2 },
  { nameEn: 'University of Oxford',                          nameZh: '牛津大学',              country: '英国',     city: '牛津',      qsRank: 3 },
  { nameEn: 'Harvard University',                            nameZh: '哈佛大学',              country: '美国',     city: '剑桥(MA)',  qsRank: 4 },
  { nameEn: 'University of Cambridge',                       nameZh: '剑桥大学',              country: '英国',     city: '剑桥',      qsRank: 5 },
  { nameEn: 'Stanford University',                           nameZh: '斯坦福大学',            country: '美国',     city: '斯坦福',    qsRank: 6 },
  { nameEn: 'ETH Zurich',                                    nameZh: '苏黎世联邦理工学院',    country: '瑞士',     city: '苏黎世',    qsRank: 7 },
  { nameEn: 'National University of Singapore',              nameZh: '新加坡国立大学',        country: '新加坡',   city: '新加坡',    qsRank: 8 },
  { nameEn: 'University College London',                     nameZh: '伦敦大学学院',          country: '英国',     city: '伦敦',      qsRank: 9 },
  { nameEn: 'California Institute of Technology',            nameZh: '加州理工学院',          country: '美国',     city: '帕萨迪纳',  qsRank: 10 },
  { nameEn: 'University of Pennsylvania',                    nameZh: '宾夕法尼亚大学',        country: '美国',     city: '费城',      qsRank: 11 },
  { nameEn: 'University of California, Berkeley',            nameZh: '加州大学伯克利分校',    country: '美国',     city: '伯克利',    qsRank: 12 },
  { nameEn: 'The University of Melbourne',                   nameZh: '墨尔本大学',            country: '澳大利亚', city: '墨尔本',    qsRank: 13 },
  { nameEn: 'Peking University',                             nameZh: '北京大学',              country: '中国',     city: '北京',      qsRank: 14 },
  { nameEn: 'Nanyang Technological University',              nameZh: '南洋理工大学',          country: '新加坡',   city: '新加坡',    qsRank: 15 },
  { nameEn: 'Cornell University',                            nameZh: '康奈尔大学',            country: '美国',     city: '伊萨卡',    qsRank: 16 },
  { nameEn: 'University of Hong Kong',                       nameZh: '香港大学',              country: '中国香港', city: '香港',      qsRank: 17 },
  { nameEn: 'The University of Sydney',                      nameZh: '悉尼大学',              country: '澳大利亚', city: '悉尼',      qsRank: 18 },
  { nameEn: 'The University of New South Wales',             nameZh: '新南威尔士大学',        country: '澳大利亚', city: '悉尼',      qsRank: 19 },
  { nameEn: 'Tsinghua University',                           nameZh: '清华大学',              country: '中国',     city: '北京',      qsRank: 20 },
  { nameEn: 'University of Chicago',                         nameZh: '芝加哥大学',            country: '美国',     city: '芝加哥',    qsRank: 21 },
  { nameEn: 'Princeton University',                          nameZh: '普林斯顿大学',          country: '美国',     city: '普林斯顿',  qsRank: 22 },
  { nameEn: 'Yale University',                               nameZh: '耶鲁大学',              country: '美国',     city: '纽黑文',    qsRank: 23 },
  { nameEn: 'University of Toronto',                         nameZh: '多伦多大学',            country: '加拿大',   city: '多伦多',    qsRank: 24 },
  { nameEn: 'EPFL',                                          nameZh: '洛桑联邦理工学院',      country: '瑞士',     city: '洛桑',      qsRank: 26 },
  { nameEn: 'University of Edinburgh',                       nameZh: '爱丁堡大学',            country: '英国',     city: '爱丁堡',    qsRank: 27 },
  { nameEn: 'McGill University',                             nameZh: '麦吉尔大学',            country: '加拿大',   city: '蒙特利尔',  qsRank: 29 },
  { nameEn: 'Australian National University',                nameZh: '澳大利亚国立大学',      country: '澳大利亚', city: '堪培拉',    qsRank: 30 },
  { nameEn: 'Seoul National University',                     nameZh: '首尔大学',              country: '韩国',     city: '首尔',      qsRank: 31 },
  { nameEn: 'Korea Advanced Institute of Science and Technology', nameZh: '韩国科学技术院',  country: '韩国',     city: '大田',      qsRank: 53 },
  { nameEn: 'Monash University',                             nameZh: '莫纳什大学',            country: '澳大利亚', city: '墨尔本',    qsRank: 37 },
  { nameEn: 'The University of Tokyo',                       nameZh: '东京大学',              country: '日本',     city: '东京',      qsRank: 32 },
  { nameEn: 'New York University',                           nameZh: '纽约大学',              country: '美国',     city: '纽约',      qsRank: 38 },
  { nameEn: 'University of British Columbia',                nameZh: '英属哥伦比亚大学',      country: '加拿大',   city: '温哥华',    qsRank: 38 },
  { nameEn: 'The University of Manchester',                  nameZh: '曼彻斯特大学',          country: '英国',     city: '曼彻斯特',  qsRank: 34 },
  { nameEn: 'Université PSL',                                nameZh: '巴黎文理研究大学',      country: '法国',     city: '巴黎',      qsRank: 24 },
  { nameEn: 'Northwestern University',                       nameZh: '西北大学',              country: '美国',     city: '埃文斯顿',  qsRank: 50 },
  { nameEn: 'Fudan University',                              nameZh: '复旦大学',              country: '中国',     city: '上海',      qsRank: 39 },
  { nameEn: "King's College London",                         nameZh: '伦敦国王学院',          country: '英国',     city: '伦敦',      qsRank: 40 },
  { nameEn: 'Kyoto University',                              nameZh: '京都大学',              country: '日本',     city: '京都',      qsRank: 50 },
  { nameEn: 'The Chinese University of Hong Kong',           nameZh: '香港中文大学',          country: '中国香港', city: '香港',      qsRank: 36 },
  { nameEn: 'University of Michigan-Ann Arbor',              nameZh: '密歇根大学安娜堡分校',  country: '美国',     city: '安娜堡',    qsRank: 44 },
  { nameEn: 'Johns Hopkins University',                      nameZh: '约翰霍普金斯大学',      country: '美国',     city: '巴尔的摩',  qsRank: 28 },
  { nameEn: 'The University of Queensland',                  nameZh: '昆士兰大学',            country: '澳大利亚', city: '布里斯班',  qsRank: 40 },
  { nameEn: 'McMaster University',                           nameZh: '麦克马斯特大学',        country: '加拿大',   city: '汉密尔顿',  qsRank: 189 },
  { nameEn: 'Sorbonne University',                           nameZh: '索邦大学',              country: '法国',     city: '巴黎',      qsRank: 59 },
  { nameEn: 'Universidad Nacional Autónoma de México',       nameZh: '墨西哥国立自治大学',    country: '墨西哥',   city: '墨西哥城',  qsRank: 94 },
  { nameEn: 'Shanghai Jiao Tong University',                 nameZh: '上海交通大学',          country: '中国',     city: '上海',      qsRank: 45 },
  { nameEn: 'Zhejiang University',                           nameZh: '浙江大学',              country: '中国',     city: '杭州',      qsRank: 47 },
  { nameEn: 'London School of Economics and Political Science', nameZh: '伦敦政治经济学院',   country: '英国',     city: '伦敦',      qsRank: 50 },
  { nameEn: 'The Hong Kong University of Science and Technology', nameZh: '香港科技大学',    country: '中国香港', city: '香港',      qsRank: 47 },
  { nameEn: 'Korea University',                              nameZh: '高丽大学',              country: '韩国',     city: '首尔',      qsRank: 67 },
  { nameEn: 'The Hong Kong Polytechnic University',          nameZh: '香港理工大学',          country: '中国香港', city: '香港',      qsRank: 57 },
  { nameEn: 'Yonsei University',                             nameZh: '延世大学',              country: '韩国',     city: '首尔',      qsRank: 56 },
  { nameEn: 'Indian Institute of Technology Bombay',         nameZh: '印度理工学院孟买分校',  country: '印度',     city: '孟买',      qsRank: 118 },
  { nameEn: 'Indian Institute of Technology Delhi',          nameZh: '印度理工学院德里分校',  country: '印度',     city: '新德里',    qsRank: 150 },
  { nameEn: 'Trinity College Dublin',                        nameZh: '都柏林圣三一学院',      country: '爱尔兰',   city: '都柏林',    qsRank: 87 },
  { nameEn: 'Duke University',                               nameZh: '杜克大学',              country: '美国',     city: '达勒姆',    qsRank: 50 },
  { nameEn: 'Tokyo Institute of Technology',                 nameZh: '东京工业大学',          country: '日本',     city: '东京',      qsRank: 84 },
  { nameEn: 'Carnegie Mellon University',                    nameZh: '卡内基梅隆大学',        country: '美国',     city: '匹兹堡',    qsRank: 58 },
  { nameEn: 'KTH Royal Institute of Technology',             nameZh: '皇家理工学院',          country: '瑞典',     city: '斯德哥尔摩', qsRank: 73 },
  { nameEn: 'Lund University',                               nameZh: '隆德大学',              country: '瑞典',     city: '隆德',      qsRank: 75 },
  { nameEn: 'Universiti Malaya',                             nameZh: '马来亚大学',            country: '马来西亚', city: '吉隆坡',    qsRank: 60 },
  { nameEn: 'The University of Western Australia',           nameZh: '西澳大学',              country: '澳大利亚', city: '珀斯',      qsRank: 77 },
  { nameEn: 'University of Bristol',                         nameZh: '布里斯托大学',          country: '英国',     city: '布里斯托',  qsRank: 54 },
  { nameEn: 'University of Amsterdam',                       nameZh: '阿姆斯特丹大学',        country: '荷兰',     city: '阿姆斯特丹', qsRank: 53 },
  { nameEn: 'University of Warwick',                         nameZh: '华威大学',              country: '英国',     city: '考文垂',    qsRank: 69 },
  { nameEn: 'University of Leeds',                           nameZh: '利兹大学',              country: '英国',     city: '利兹',      qsRank: 82 },
  { nameEn: 'University of Zurich',                          nameZh: '苏黎世大学',            country: '瑞士',     city: '苏黎世',    qsRank: 92 },
  { nameEn: 'Delft University of Technology',                nameZh: '代尔夫特理工大学',      country: '荷兰',     city: '代尔夫特',  qsRank: 47 },
  { nameEn: 'KU Leuven',                                     nameZh: '鲁汶大学',              country: '比利时',   city: '鲁汶',      qsRank: 60 },
  { nameEn: 'University of Glasgow',                         nameZh: '格拉斯哥大学',          country: '英国',     city: '格拉斯哥',  qsRank: 78 },
  { nameEn: 'University of Copenhagen',                      nameZh: '哥本哈根大学',          country: '丹麦',     city: '哥本哈根',  qsRank: 100 },
  { nameEn: 'University of Adelaide',                        nameZh: '阿德莱德大学',          country: '澳大利亚', city: '阿德莱德',  qsRank: 82 },
  { nameEn: 'Brown University',                              nameZh: '布朗大学',              country: '美国',     city: '普罗维登斯', qsRank: 64 },
  { nameEn: 'Durham University',                             nameZh: '杜伦大学',              country: '英国',     city: '杜伦',      qsRank: 78 },
  { nameEn: 'University of Southampton',                     nameZh: '南安普顿大学',          country: '英国',     city: '南安普顿',  qsRank: 80 },
  { nameEn: 'Universidad de Barcelona',                      nameZh: '巴塞罗那大学',          country: '西班牙',   city: '巴塞罗那',  qsRank: 168 },
  { nameEn: 'Texas A&M University',                          nameZh: '德克萨斯农工大学',      country: '美国',     city: '学院站',    qsRank: 154 },
  { nameEn: 'The University of Auckland',                    nameZh: '奥克兰大学',            country: '新西兰',   city: '奥克兰',    qsRank: 65 },
  { nameEn: 'University of California, Davis',               nameZh: '加州大学戴维斯分校',    country: '美国',     city: '戴维斯',    qsRank: 113 },
  { nameEn: 'Hong Kong Baptist University',                  nameZh: '香港浸会大学',          country: '中国香港', city: '香港',      qsRank: 252 },
  { nameEn: 'University of Bologna',                         nameZh: '博洛尼亚大学',          country: '意大利',   city: '博洛尼亚',  qsRank: 133 },
  { nameEn: 'University of California, San Diego',           nameZh: '加州大学圣地亚哥分校',  country: '美国',     city: '圣地亚哥',  qsRank: 72 },
  { nameEn: 'University of Birmingham',                      nameZh: '伯明翰大学',            country: '英国',     city: '伯明翰',    qsRank: 80 },
  { nameEn: 'University of Helsinki',                        nameZh: '赫尔辛基大学',          country: '芬兰',     city: '赫尔辛基',  qsRank: 115 },
  { nameEn: 'University of Vienna',                          nameZh: '维也纳大学',            country: '奥地利',   city: '维也纳',    qsRank: 110 },
  { nameEn: 'University of St Andrews',                      nameZh: '圣安德鲁斯大学',        country: '英国',     city: '圣安德鲁斯', qsRank: 95 },
  { nameEn: 'Pohang University of Science and Technology',   nameZh: '浦项科技大学',          country: '韩国',     city: '浦项',      qsRank: 98 },
  { nameEn: 'University of Oslo',                            nameZh: '奥斯陆大学',            country: '挪威',     city: '奥斯陆',    qsRank: 117 },
  { nameEn: 'University of Geneva',                          nameZh: '日内瓦大学',            country: '瑞士',     city: '日内瓦',    qsRank: 158 },
  { nameEn: 'University of Nottingham',                      nameZh: '诺丁汉大学',            country: '英国',     city: '诺丁汉',    qsRank: 108 },
  { nameEn: 'University of Sheffield',                       nameZh: '谢菲尔德大学',          country: '英国',     city: '谢菲尔德',  qsRank: 105 },
  { nameEn: 'University of California, Los Angeles',         nameZh: '加州大学洛杉矶分校',    country: '美国',     city: '洛杉矶',    qsRank: 42 },
  { nameEn: 'Columbia University',                           nameZh: '哥伦比亚大学',          country: '美国',     city: '纽约',      qsRank: 34 },
  { nameEn: 'Boston University',                             nameZh: '波士顿大学',            country: '美国',     city: '波士顿',    qsRank: 108 },
  { nameEn: 'Washington University in St. Louis',            nameZh: '圣路易斯华盛顿大学',    country: '美国',     city: '圣路易斯',  qsRank: 100 },
  { nameEn: 'Emory University',                              nameZh: '埃默里大学',            country: '美国',     city: '亚特兰大',  qsRank: 124 },
  { nameEn: 'University of Wisconsin-Madison',               nameZh: '威斯康星大学麦迪逊分校', country: '美国',     city: '麦迪逊',    qsRank: 102 },
  { nameEn: 'Vanderbilt University',                         nameZh: '范德堡大学',            country: '美国',     city: '纳什维尔',  qsRank: 215 },
  { nameEn: 'University of Texas at Austin',                 nameZh: '德克萨斯大学奥斯汀分校', country: '美国',     city: '奥斯汀',    qsRank: 56 },
  { nameEn: 'Georgia Institute of Technology',               nameZh: '佐治亚理工学院',        country: '美国',     city: '亚特兰大',  qsRank: 97 },
  { nameEn: 'University of Cape Town',                       nameZh: '开普敦大学',            country: '南非',     city: '开普敦',    qsRank: 171 },
];

async function main() {
  console.log(`--- Seed: QS Top 100 大学（${QS2025.length} 所）---`);
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const u of QS2025) {
    const exists = await prisma.university.findUnique({
      where: { nameEn_country: { nameEn: u.nameEn, country: u.country } },
    });
    if (exists) {
      // 仅更新可能变化的字段，不动 logoUrl（保留运营手动上传的）
      const needUpdate =
        exists.nameZh !== u.nameZh ||
        exists.city !== u.city ||
        exists.qsRank !== u.qsRank ||
        exists.qsYear !== 2025;
      if (needUpdate) {
        await prisma.university.update({
          where: { id: exists.id },
          data: { nameZh: u.nameZh, city: u.city, qsRank: u.qsRank, qsYear: 2025 },
        });
        updated++;
      } else {
        unchanged++;
      }
    } else {
      await prisma.university.create({
        data: { ...u, qsYear: 2025, active: true },
      });
      created++;
    }
  }

  console.log(`Done: created=${created} / updated=${updated} / unchanged=${unchanged}`);
}

main()
  .catch((e) => {
    console.error('Seed QS Top 100 failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
