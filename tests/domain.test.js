/**
 * 原型的计算与报告契约检查。
 * 重点覆盖零基数、历史不足和跨组排序等会误导运营的边界；DOM 交互另由实际浏览器验证。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { categories, keywords, styles } from '../src/mockData.js';
import { getOwnProducts, groupReport, metrics, moveReportItem, rankItems, systemLevel } from '../src/domain.js';

// 独立手算样本，验证周增长确实比较两个不重叠的 7 天，而不是平均每日增长率。
test('日增长与周增长使用各自的可比窗口', () => {
  const item = { history: [...Array(7).fill(100), ...Array(6).fill(200), 300].map((value) => ({ value })) };
  assert.equal(metrics(item).volume, 300);
  assert.equal(metrics(item).day, 50);
  assert.ok(Math.abs(metrics(item).week - 114.28571428571428) < 1e-8);
});

// 不把不存在的基数显示成 Infinity 或 0%，否则运营会错误理解“爆发”。
test('零基数与历史不足不生成增长率', () => {
  assert.equal(metrics({ history: [{ value: 0 }, { value: 30 }] }).day, null);
  assert.equal(metrics({ history: [{ value: 30 }] }).week, null);
});

// 数据不足时不会把商品改判为差；自家匹配返回的是数据清单，没有评分状态。
test('自家匹配分别支持品类、款式、关键词与无匹配', () => {
  assert.equal(getOwnProducts(styles[0]).length, 2);
  assert.equal(getOwnProducts(keywords[0]).length, 2);
  assert.equal(getOwnProducts(categories[0]).length, 4);
  assert.equal(getOwnProducts(styles[4]).length, 0);
  assert.equal('status' in getOwnProducts(styles[0])[0], false);
});

// 同时达到日/周阈值的演示样本只显示爆发，避免解释和等级彼此冲突。
test('样本等级遵循爆发优先、增长和稳定', () => {
  assert.equal(systemLevel(styles[0]), '爆发');
  assert.equal(systemLevel(styles[1]), '增长');
  assert.equal(systemLevel(styles[9]), '稳定');
});

// 品类汇总应该等于所属款式之和，保证不同入口读到相同的数据。
test('30 天数据完整且品类每日量与款式汇总一致', () => {
  for (const category of categories) {
    assert.equal(category.history.length, 30);
    category.history.forEach((point, index) => {
      const sum = styles.filter((item) => item.category === category.name).reduce((total, item) => total + item.history[index].value, 0);
      assert.equal(point.value, sum);
      assert.ok(point.value >= 0);
    });
  }
});

// 切换排序不修改原始数据，筛选前名次稳定，保证详情和报告能按 id 复用同一项。
test('增长排名降序且保持 fixture 不变', () => {
  const ids = styles.map((item) => item.id);
  const ranked = rankItems(styles, 'week');
  for (let index = 1; index < ranked.length; index++) assert.ok(metrics(ranked[index - 1]).week >= metrics(ranked[index]).week);
  assert.deepEqual(styles.map((item) => item.id), ids);
  assert.equal(ranked[0].rank, 1);
});

// 报告组次序固定，但运营可以在款式组里调整；组首上移必须保持不变。
test('报告排序不跨越品类/款式/关键词边界', () => {
  const items = [keywords[0], styles[0], categories[0], styles[1]];
  assert.deepEqual(groupReport(items).map((group) => group.type), ['category', 'style', 'keyword']);
  const moved = moveReportItem(items, styles[1].id, -1);
  assert.deepEqual(groupReport(moved)[1].items.map((item) => item.id), [styles[1].id, styles[0].id]);
  assert.deepEqual(moveReportItem(items, styles[0].id, -1), items);
  assert.deepEqual(moveReportItem(items, 'missing', 1), items);
});
