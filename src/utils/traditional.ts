/**
 * 中国传统色、日本传统色。色值取自网上流传最广的几份色表，不同资料之间略有出入，仅供参考。
 */
import {Vec3} from './space';
import {parseHex, rgbToHsl} from './csscolor';

interface TradColor {
  name: string;
  reading: string;
  hex: string;
  group: string;
  note?: string;
}

const CN_GROUPS = ['红', '橙黄棕', '绿', '青蓝', '紫', '白灰黑'];
const JP_GROUPS = ['红・橙', '黄・绿', '青蓝', '紫', '白・灰・黑・茶'];

const c = (group: string, name: string, reading: string, hex: string, note?: string): TradColor => {
  return {group, name, reading, hex: hex.toUpperCase(), note};
};

const CHINESE: TradColor[] = [
  c('红', '朱砂', 'zhū shā', '#ff461f', '来自天然硫化汞矿物（辰砂）研磨而成的红色颜料，也用于印泥、制墨'),
  c('红', '朱红', 'zhū hóng', '#ff4c00'),
  c('红', '银朱', 'yín zhū', '#bf242a', '人工合成的硫化汞颜料'),
  c('红', '丹', 'dān', '#ff4e20'),
  c('红', '赤', 'chì', '#c3272b'),
  c('红', '大红', 'dà hóng', '#ff2121'),
  c('红', '绯红', 'fēi hóng', '#c83c23'),
  c('红', '茜色', 'qiàn sè', '#cb3a56', '以茜草的根染出的红色'),
  c('红', '胭脂', 'yān zhī', '#9d2933', '古时由红蓝花等植物制成的红色化妆与绘画颜料'),
  c('红', '殷红', 'yān hóng', '#be002f'),
  c('红', '枣红', 'zǎo hóng', '#c32136', '像成熟红枣的深红色'),
  c('红', '石榴红', 'shí liu hóng', '#f20c00', '石榴花的红色'),
  c('红', '海棠红', 'hǎi táng hóng', '#db5a6b', '海棠花的红色'),
  c('红', '桃红', 'táo hóng', '#f47983', '桃花的红色'),
  c('红', '嫣红', 'yān hóng', '#ef7a82'),
  c('橙黄棕', '橘红', 'jú hóng', '#ff7500'),
  c('橙黄棕', '杏黄', 'xìng huáng', '#ffa631', '成熟杏子的黄色'),
  c('橙黄棕', '藤黄', 'téng huáng', '#ffb61e', '藤黄树的树脂制成的黄色颜料，有毒'),
  c('橙黄棕', '缃色', 'xiāng sè', '#f0c239', '古人对浅黄色丝帛的称呼'),
  c('橙黄棕', '鹅黄', 'é huáng', '#fff143', '小鹅绒毛般的嫩黄色'),
  c('橙黄棕', '姜黄', 'jiāng huáng', '#ffc773'),
  c('橙黄棕', '雄黄', 'xióng huáng', '#e9bb1d', '来自含砷的矿物，作颜料，有毒'),
  c('橙黄棕', '赤金', 'chì jīn', '#f2be45'),
  c('橙黄棕', '秋香色', 'qiū xiāng sè', '#d9b611'),
  c('橙黄棕', '琥珀', 'hǔ pò', '#ca6924', '树脂化石的颜色'),
  c('橙黄棕', '栗色', 'lì sè', '#60281e'),
  c('橙黄棕', '驼色', 'tuó sè', '#a88462'),
  c('橙黄棕', '赭石', 'zhě shí', '#845a33', '含氧化铁的矿物颜料'),
  c('橙黄棕', '赭', 'zhě', '#9c5333'),
  c('橙黄棕', '檀', 'tán', '#b36d61'),
  c('橙黄棕', '紫檀', 'zǐ tán', '#4c221b', '紫檀木的深褐色'),
  c('绿', '石绿', 'shí lǜ', '#16a951', '来自孔雀石研磨的矿物颜料'),
  c('绿', '松柏绿', 'sōng bǎi lǜ', '#21a675'),
  c('绿', '竹青', 'zhú qīng', '#789262', '竹子表皮的青绿色'),
  c('绿', '葱绿', 'cōng lǜ', '#9ed900'),
  c('绿', '柳绿', 'liǔ lǜ', '#afdd22', '初生柳叶的嫩绿'),
  c('绿', '嫩绿', 'nèn lǜ', '#bddd22'),
  c('绿', '松花色', 'sōng huā sè', '#bce672'),
  c('绿', '豆绿', 'dòu lǜ', '#9ed048'),
  c('绿', '碧色', 'bì sè', '#1bd1a5'),
  c('绿', '艾绿', 'ài lǜ', '#a4e2c6'),
  c('绿', '缥', 'piǎo', '#7fecad'),
  c('绿', '青碧', 'qīng bì', '#48c0a3'),
  c('绿', '黛绿', 'dài lǜ', '#426666'),
  c('青蓝', '石青', 'shí qīng', '#1685a9', '来自蓝铜矿研磨的矿物颜料'),
  c('青蓝', '靛青', 'diàn qīng', '#177cb0', '来自蓝草发酵提取的植物染料'),
  c('青蓝', '靛蓝', 'diàn lán', '#065279', '来自蓝草发酵提取的植物染料'),
  c('青蓝', '蔚蓝', 'wèi lán', '#70f3ff'),
  c('青蓝', '碧蓝', 'bì lán', '#3eede7'),
  c('青蓝', '群青', 'qún qīng', '#4c8dae'),
  c('青蓝', '藏青', 'zàng qīng', '#2e4e7e'),
  c('青蓝', '宝蓝', 'bǎo lán', '#4b5cc4'),
  c('青蓝', '黛', 'dài', '#4a4266', '古代女子画眉用的青黑色颜料'),
  c('紫', '青莲', 'qīng lián', '#801dae'),
  c('紫', '紫棠', 'zǐ táng', '#56004f'),
  c('紫', '绛紫', 'jiàng zǐ', '#8c4356'),
  c('紫', '酱紫', 'jiàng zǐ', '#815476'),
  c('紫', '丁香色', 'dīng xiāng sè', '#cca4e3', '丁香花的淡紫色'),
  c('紫', '雪青', 'xuě qīng', '#b0a4e3'),
  c('紫', '藕荷色', 'ǒu hé sè', '#e4c6d0'),
  c('白灰黑', '月白', 'yuè bái', '#d6ecf0', '淡淡的蓝白色，像月光'),
  c('白灰黑', '象牙白', 'xiàng yá bái', '#fffbf0'),
  c('白灰黑', '鱼肚白', 'yú dù bái', '#fcefe8', '黎明时东方天空的颜色'),
  c('白灰黑', '银白', 'yín bái', '#e9e7ef'),
  c('白灰黑', '墨色', 'mò sè', '#50616d', '松烟、油烟制成的墨的颜色'),
  c('白灰黑', '黧', 'lí', '#5d513c'),
  c('白灰黑', '乌黑', 'wū hēi', '#665757'),
  c('白灰黑', '玄色', 'xuán sè', '#622a1d', '黑中带赤的深色'),
  c('白灰黑', '漆黑', 'qī hēi', '#161823')
];

const JAPANESE: TradColor[] = [
  c('红・橙', '桜色', 'sakura-iro', '#fef4f4', '樱花花瓣的淡粉色'),
  c('红・橙', '紅梅色', 'kōbai-iro', '#f2a0a1', '红梅花的颜色'),
  c('红・橙', '茜色', 'akane-iro', '#b7282e', '以茜草的根染出的红色'),
  c('红・橙', '朱色', 'shu-iro', '#eb6101'),
  c('红・橙', '紅色', 'beni-iro', '#d7003a'),
  c('红・橙', '柿色', 'kaki-iro', '#ed6d3d'),
  c('红・橙', '蘇芳', 'suō', '#9e3d3f', '以苏木染出的暗红色'),
  c('黄・绿', '山吹色', 'yamabuki-iro', '#f8b500', '棣棠花（山吹）的黄色'),
  c('黄・绿', '鬱金色', 'ukon-iro', '#fabf14', '以姜黄（郁金）染出的黄色'),
  c('黄・绿', '若草色', 'wakakusa-iro', '#c3d825'),
  c('黄・绿', '萌黄', 'moegi', '#aacf53', '草木新芽的黄绿色'),
  c('黄・绿', '若竹色', 'wakatake-iro', '#68be8d', '嫩竹的颜色'),
  c('黄・绿', '常磐色', 'tokiwa-iro', '#007b43', '常绿树叶的深绿'),
  c('黄・绿', '松葉色', 'matsuba-iro', '#839b5c', '松针的颜色'),
  c('黄・绿', '鶯色', 'uguisu-iro', '#928c36', '日本树莺羽毛的褐绿色'),
  c('黄・绿', '青磁色', 'seiji-iro', '#7ebea5'),
  c('青蓝', '浅葱色', 'asagi-iro', '#00a3af'),
  c('青蓝', '納戸色', 'nando-iro', '#008899'),
  c('青蓝', '縹色', 'hanada-iro', '#2792c3'),
  c('青蓝', '藍色', 'ai-iro', '#165e83', '蓝草染出的蓝色'),
  c('青蓝', '紺色', 'kon-iro', '#223a70'),
  c('青蓝', '群青色', 'gunjō-iro', '#4c6cb3'),
  c('青蓝', '瑠璃色', 'ruri-iro', '#1e50a2'),
  c('青蓝', '空色', 'sora-iro', '#a0d8ef', '晴天天空的颜色'),
  c('青蓝', '水色', 'mizu-iro', '#bce2e8'),
  c('紫', '藤色', 'fuji-iro', '#bbbcde', '紫藤花的淡紫色'),
  c('紫', '紫', 'murasaki', '#884898'),
  c('紫', '菖蒲色', 'ayame-iro', '#cc7eb1'),
  c('紫', '江戸紫', 'edo-murasaki', '#745399'),
  c('白・灰・黑・茶', '利休鼠', 'rikyū-nezumi', '#888e7e', '带绿色调的灰色'),
  c('白・灰・黑・茶', '鼠色', 'nezumi-iro', '#949495'),
  c('白・灰・黑・茶', '銀鼠', 'gin-nezumi', '#afafb0'),
  c('白・灰・黑・茶', '墨', 'sumi', '#595857', '墨的颜色'),
  c('白・灰・黑・茶', '象牙色', 'zōge-iro', '#f8f4e6'),
  c('白・灰・黑・茶', '生成り色', 'kinari-iro', '#fbfaf5', '未经漂白、染色的布料的本色'),
  c('白・灰・黑・茶', '鳶色', 'tobi-iro', '#95483f', '像鸢（黑鸢）的羽毛的红褐色'),
  c('白・灰・黑・茶', '茶色', 'cha-iro', '#965042'),
  c('白・灰・黑・茶', '白', 'shiro', '#ffffff'),
  c('白・灰・黑・茶', '漆黑', 'shikkoku', '#0d0015')
];

const rgbOf = (item: TradColor): Vec3 => parseHex(item.hex) as Vec3;

/** 色相（0~360）；饱和度很低的灰白黑没有稳定的色相，放在最后，按明度排序 */
const sortKey = (item: TradColor): number => {
  const [h, s, l] = rgbToHsl(rgbOf(item));
  return s < 8 ? 1000 + (100 - l) : h;
};

const sortByHue = (list: TradColor[]): TradColor[] => list.slice().sort((a, b) => sortKey(a) - sortKey(b));

const matchesQuery = (item: TradColor, query: string): boolean => {
  const q = query.trim().toLowerCase().replace('#', '');
  if (!q) {
    return true;
  }
  return item.name.includes(q) || item.reading.replace(/ /g, '').toLowerCase().includes(q.replace(/ /g, '')) || item.hex.slice(1).toLowerCase().includes(q);
};

export {
  TradColor,
  CN_GROUPS,
  JP_GROUPS,
  CHINESE,
  JAPANESE,
  rgbOf,
  sortByHue,
  matchesQuery
};
