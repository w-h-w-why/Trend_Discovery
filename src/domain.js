/**
 * 原型的纯计算层：从同一份逐日样本派生增长、等级、名次、匹配和报告分组。
 * 周增长暂按近 7 天总量 / 前 7 天总量；名次为本系统增长榜。均为本次演示默认，
 * 不意味着生产业务规则已确认。自家商品不在本模块接受任何表现好坏评分。
 */
import { ownProducts, styles } from './mockData.js';

export const TYPE_LABELS = { category: '品类', style: '款式', keyword: '关键词' };
export const TYPE_ORDER = ['category', 'style', 'keyword'];
export const LEVELS = ['爆发', '增长', '稳定'];

/** 中文数值格式化；非有限数字显示占位，避免缺失数据被误认为 0。 */
export function formatNumber(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat('zh-CN').format(value) : '—';
}

/** 比较同单位的本期与前期总量；零基数返回 null，不展示无限增长。 */
export function growthRate(current, previous) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

/** 从逐日完整搜索量读取今日、日增长、周增长；历史不足时返回 null。 */
export function metrics(item) {
  const values = item.history.map((point) => point.value);
  const last = values.length - 1;
  const currentWeek = values.slice(-7).reduce((sum, value) => sum + value, 0);
  const previousWeek = values.slice(-14, -7).reduce((sum, value) => sum + value, 0);
  return {
    volume: values[last] ?? null,
    day: last >= 1 ? growthRate(values[last], values[last - 1]) : null,
    week: values.length >= 14 ? growthRate(currentWeek, previousWeek) : null,
  };
}

/** 按已确认阈值演示等级；同时命中时爆发优先，仅作为原型默认。 */
export function systemLevel(item) {
  const values = metrics(item);
  if (values.day > 100) return '爆发';
  if (values.week > 30) return '增长';
  return '稳定';
}

/** 输出带符号的百分比；零基数和缺失历史清晰显示为无可比数据。 */
export function formatGrowth(value) {
  return Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%` : '暂无可比数据';
}

/** 依据 day/week 增长排序，按 id 稳定处理同值，返回新数组而不改动 fixture。 */
export function rankItems(items, growthWindow) {
  return [...items].sort((a, b) => (metrics(b)[growthWindow] ?? -Infinity) - (metrics(a)[growthWindow] ?? -Infinity) || a.id.localeCompare(b.id))
    .map((item, index) => ({
      ...item, rank: index + 1,
      rankDelta: (item.previousRanks[growthWindow] ?? index + 1) - (index + 1),
    }));
}

/** 根据层级关联自家商品；关键词借助 styleId、品类按所属品类匹配，无匹配返回空数组。 */
export function getOwnProducts(item) {
  if (!item) return [];
  if (item.type === 'category') return ownProducts.filter((product) => product.category === item.category);
  return ownProducts.filter((product) => product.styleIds.includes(item.styleId ?? item.id));
}

/** 返回与趋势相关的代表款式，供品类/关键词详情追溯，不替换实际选中的详情主体。 */
export function getRelatedStyles(item) {
  if (item.type === 'category') return styles.filter((style) => style.category === item.category);
  if (item.type === 'keyword') return styles.filter((style) => style.id === item.styleId);
  return [item];
}

/** 用计算依据解释系统判定；人工等级只改变展示，不改写事实或搜索量。 */
export function explainTrend(item) {
  const values = metrics(item);
  const level = systemLevel(item);
  if (level === '爆发') return `近 1 天搜索量增长 ${formatGrowth(values.day)}，超过 100% 的爆发阈值。近 7 天增长 ${formatGrowth(values.week)}。`;
  if (level === '增长') return `近 7 天搜索量较前 7 天增长 ${formatGrowth(values.week)}，超过 30% 的增长阈值。近 1 天增长 ${formatGrowth(values.day)}。`;
  return `近 7 天搜索量增长 ${formatGrowth(values.week)}，尚未达到增长阈值；近 1 天增长 ${formatGrowth(values.day)}，归入稳定档。`;
}

/** 品类→款式→关键词的报告顺序固定；各组内部保留运营调整后的顺序。 */
export function groupReport(items) {
  return TYPE_ORDER.map((type) => ({ type, label: TYPE_LABELS[type], items: items.filter((item) => item.type === type) })).filter((group) => group.items.length);
}

/** 相邻移动仅在同一报告组内发生；越界请求返回原数组，保持组结构不被破坏。 */
export function moveReportItem(items, id, direction) {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const groupIndices = items.map((item, current) => item.type === items[index].type ? current : -1).filter((current) => current >= 0);
  const target = groupIndices[groupIndices.indexOf(index) + direction];
  if (target === undefined) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
