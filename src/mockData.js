/**
 * 女装趋势原型的唯一数据来源，没有网络请求。
 * 固定完整数据日为 2026-10-12，提供 30 天逐日搜索量。词量按款式拆分、品类按
 * 款式汇总，让图表、榜单和报告取自同一批样本。它们不是唯品会的真实数据。
 */
export const DATA_DATE = '2026-10-12';
export const UPDATED_AT = '2026-10-12 09:00';

/** 根据给定起点、日增速和末日跃升构造非负逐日样本；不模拟真实市场算法。 */
function makeHistory(base, rate, jump = 1) {
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(`${DATA_DATE}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 29 + index);
    const fluctuation = 1 + Math.sin(index * 1.1) * 0.018;
    return {
      date: date.toISOString().slice(0, 10),
      value: Math.round(base * Math.exp(rate * index) * fluctuation * (index === 29 ? jump : 1)),
    };
  });
}

const definitions = [
  ['floral', '碎花连衣裙', '连衣裙', 1800, .065, 2.15, '#e88461', ['碎花连衣裙', '法式碎花裙', '小碎花连衣裙'], 'floral'],
  ['waist', '收腰连衣裙', '连衣裙', 1900, .072, 1, '#cf855b', ['收腰连衣裙', '显瘦连衣裙', '茶歇裙'], 'dress'],
  ['cardigan', '薄款针织开衫', '针织衫', 1700, .062, 1, '#a997d3', ['薄款针织开衫', '针织防晒开衫', '冰丝开衫'], 'knit'],
  ['wide', '垂感阔腿裤', '阔腿裤', 1500, .058, 1, '#83a7a0', ['垂感阔腿裤', '通勤阔腿裤', '西装阔腿裤'], 'pants'],
  ['ice', '冰丝阔腿裤', '阔腿裤', 1250, .050, 1, '#7c9cbe', ['冰丝阔腿裤', '凉感阔腿裤', '夏季阔腿裤'], 'pants'],
  ['sleeve', '泡泡袖上衣', '上衣', 1300, .046, 1, '#ccac7c', ['泡泡袖上衣', '方领泡泡袖', '泡泡袖衬衫'], 'top'],
  ['short', '短款针织衫', '针织衫', 1200, .043, 1, '#b299ae', ['短款针织衫', '短款开衫', '短款针织上衣'], 'knit'],
  ['denim', '牛仔连衣裙', '连衣裙', 1000, .038, 1, '#8a9fbb', ['牛仔连衣裙', '牛仔背带裙', '牛仔衬衫裙'], 'dress'],
  ['satin', '缎面半身裙', '半身裙', 950, .030, 1, '#bbaa96', ['缎面半身裙', '醋酸半身裙', '通勤长裙'], 'skirt'],
  ['crochet', '钩针镂空上衣', '上衣', 850, .021, 1, '#b8a99b', ['钩针上衣', '镂空上衣', '钩花上衣'], 'top'],
];

/** 代表商品是大盘商品样本，排名用于并排参考，不据此推导自家表现好坏。 */
function makeRepresentative(name, category, index) {
  return {
    name: `${name} · 大盘代表商品`,
    brand: ['示例品牌 A', '示例品牌 B', '示例品牌 C'][index % 3],
    rank: index + 2,
    listName: `${category}商品热销榜`,
  };
}

export const styles = definitions.map(([id, name, category, base, rate, jump, color, terms, silhouette], index) => ({
  id: `style-${id}`, type: 'style', name, category, color, silhouette,
  history: makeHistory(base, rate, jump),
  keywords: terms,
  // 上一期名次为独立样本；本期名次由所选增长周期排序计算。
  previousRanks: { day: Math.min(10, index + 3), week: Math.min(10, index + 4) },
  representative: makeRepresentative(name, category, index),
}));

export const categories = [...new Set(styles.map((item) => item.category))].map((name, index) => {
  const children = styles.filter((item) => item.category === name);
  return {
    id: `category-${index}`, type: 'category', name, category: name,
    color: children[0].color, silhouette: children[0].silhouette,
    history: children[0].history.map((point, day) => ({
      date: point.date, value: children.reduce((sum, item) => sum + item.history[day].value, 0),
    })),
    keywords: children.flatMap((item) => item.keywords),
    previousRanks: { day: Math.min(5, index + 2), week: Math.min(5, index + 2) },
    representative: children[0].representative,
  };
});

export const keywords = styles.flatMap((item) => item.keywords.map((name, index) => ({
  id: `${item.id}-keyword-${index}`, type: 'keyword', name, category: item.category,
  styleId: item.id, color: item.color, silhouette: item.silhouette,
  history: item.history.map((point) => ({ ...point, value: Math.round(point.value * [.5, .3, .2][index]) })),
  keywords: [name], previousRanks: { day: 10 + index, week: 12 + index },
  representative: item.representative,
})));

/** 自家样本只给出匹配依据和数值，不带“弱/好/未起量”等自动评价。 */
export const ownProducts = [
  { id: 'P1001', name: '法式碎花收腰雪纺连衣裙', category: '连衣裙', styleIds: ['style-floral', 'style-waist'], clicks: 1284, orders: 23, matchReasons: ['品类：连衣裙', '标题词：碎花、收腰', '属性词：雪纺', '款式词：碎花'] },
  { id: 'P1002', name: 'V 领印花夏季连衣裙', category: '连衣裙', styleIds: ['style-floral'], clicks: 436, orders: 4, matchReasons: ['品类：连衣裙', '标题词：印花', '属性词：V 领', '款式词：碎花'] },
  { id: 'P1003', name: '高腰显瘦通勤连衣裙', category: '连衣裙', styleIds: ['style-waist'], clicks: 604, orders: 9, matchReasons: ['品类：连衣裙', '标题词：显瘦', '属性词：高腰', '款式词：收腰'] },
  { id: 'P1004', name: '轻薄防晒针织开衫', category: '针织衫', styleIds: ['style-cardigan'], clicks: 512, orders: 6, matchReasons: ['品类：针织衫', '标题词：开衫', '属性词：轻薄', '款式词：针织开衫'] },
  { id: 'P1005', name: '垂感高腰通勤阔腿裤', category: '阔腿裤', styleIds: ['style-wide'], clicks: 928, orders: 20, matchReasons: ['品类：阔腿裤', '标题词：垂感', '属性词：高腰', '款式词：阔腿裤'] },
  { id: 'P1006', name: '方领泡泡袖棉质衬衫', category: '上衣', styleIds: ['style-sleeve'], clicks: 378, orders: 5, matchReasons: ['品类：上衣', '标题词：泡泡袖', '属性词：方领、棉质', '款式词：泡泡袖'] },
  { id: 'P1007', name: '牛仔短袖衬衫裙', category: '连衣裙', styleIds: ['style-denim'], clicks: 287, orders: 8, matchReasons: ['品类：连衣裙', '标题词：牛仔', '属性词：短袖', '款式词：牛仔连衣裙'] },
];

export const allTrends = [...categories, ...styles, ...keywords];
