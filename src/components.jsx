/**
 * 原型展示组件：图标、商品示意图、榜单、搜索折线和报告预览。
 * 所有输出来自 props；没有 API、外部素材和自动发送。报告利用浏览器打印布局
 * 保存 PDF，选中项与隐藏状态由父组件维护，关闭预览后再次打开仍保留调整。
 */
import { useEffect, useId, useRef } from 'react';
import { DATA_DATE, UPDATED_AT } from './mockData';
import { TYPE_LABELS, explainTrend, formatGrowth, formatNumber, getOwnProducts, groupReport, metrics, systemLevel } from './domain';

const iconPaths = {
  trend: 'M3 17 9 11 13 15 21 5 M16 5h5v5',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  report: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7',
  search: 'M16 16 21 21 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12 M6 18 18 6',
  up: 'M6 14l6-6 6 6',
  down: 'M6 10l6 6 6-6',
  download: 'M12 3v12 M6 9l6 6 6-6 M4 17v4h16v-4',
  data: 'M20 6c0 2-4 3-8 3s-8-1-8-3 4-3 8-3 8 1 8 3 M4 6v12c0 2 4 3 8 3s8-1 8-3V6 M4 12c0 2 4 3 8 3s8-1 8-3',
  spark: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  clock: 'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
};

/** 本地图标避免在线字体依赖；纯装饰默认 aria-hidden，按钮通过可见文字/标签命名。 */
export function Icon({ name, size = 18, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={iconPaths[name] ?? iconPaths.spark} /></svg>;
}

/** 款式插画为本地 SVG 示意，不将概念图冒充真实大盘商品照片。 */
export function ProductArt({ item, small = false }) {
  const kind = item.silhouette;
  return <div className={`product-art ${small ? 'small' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 120 130">
      <ellipse cx="60" cy="116" rx="30" ry="4" fill="currentColor" opacity=".1" />
      {kind === 'pants' ? <><path d="M37 23h46l-3 85H60l-1-52-6 52H32z" fill="currentColor" opacity=".8" /><path d="M38 33h43M60 24v31M44 25v8M72 25v8" stroke="white" strokeWidth="2" opacity=".55" /></> : kind === 'knit' || kind === 'top' ? <><path d="M44 24 28 31 13 66l16 7 12-23-2 56h43l-3-56 12 23 16-7-15-35-16-7q-16 15-32 0z" fill="currentColor" opacity=".8" /><path d="M49 28q11 11 22 0M60 35v70M42 99h37" stroke="white" strokeWidth="2" opacity=".55" /><circle cx="63" cy="51" r="1.5" fill="white" /><circle cx="63" cy="65" r="1.5" fill="white" /><circle cx="63" cy="79" r="1.5" fill="white" /></> : kind === 'skirt' ? <><path d="M42 30h36l17 78q-36 9-71 0z" fill="currentColor" opacity=".8" /><path d="m44 34-9 68m21-67-3 68m17-68 10 68" stroke="white" opacity=".45" strokeWidth="2" /></> : <><path d="M43 22 29 29l-7 24 16 5 8-18 2 23-23 46q35 13 70 0L72 63l2-23 8 18 16-5-7-24-14-7q-17 17-34 0z" fill="currentColor" opacity=".8" /><path d="M47 62h25M45 27q15 12 30 0" stroke="white" strokeWidth="2" opacity=".6" />{kind === 'floral' && [37, 49, 62, 75, 86].map((x, index) => <g key={x} fill="white" opacity=".6"><circle cx={x} cy={83 + index % 2 * 17} r="3" /><circle cx={x + 6} cy={72 + index % 3 * 10} r="2" /></g>)}</>}
    </svg>
  </div>;
}

/** 系统等级与运营调整分别保留；只在人工覆盖生效时附加可见标记。 */
export function LevelBadge({ item, overrides }) {
  const level = overrides[item.id] ?? systemLevel(item);
  return <span className={`level level-${level}`}>{level}{overrides[item.id] && <span className="manual-mark" title="运营手动调整"> · 人工</span>}</span>;
}

/** 名次变化来自同周期的上期样本；不把本系统增长榜名次称为大盘商品排名。 */
export function RankDelta({ value }) {
  return <span className={`rank-delta ${value < 0 ? 'negative' : value === 0 ? 'neutral' : ''}`}>{value > 0 ? '↑' : value < 0 ? '↓' : '—'} {value ? Math.abs(value) : ''}</span>;
}

/**
 * 使用真正的搜索量和日期坐标绘制 SVG 图表，纵轴从 0 起避免夸大变化。
 * days 控制展示窗口，独立于榜单 day/week 增长口径；缺失历史只画可用点。
 */
export function SearchChart({ item, days = 7, compact = false }) {
  // 图表复用 CSS 主色，确保工作台、弹窗和打印同步；款式由名称区分。
  const chartColor = 'var(--primary)';
  const gradientId = `chart-${useId().replaceAll(':', '')}`;
  const history = item.history.slice(-days);
  const peak = Math.max(...history.map((point) => point.value), 1) * 1.1;
  const width = 660;
  const height = compact ? 40 : 180;
  const padding = compact ? 0 : 55;
  const points = history.map((point, index) => ({
    x: padding + index / Math.max(history.length - 1, 1) * (width - padding - 12),
    y: 10 + height * (1 - point.value / peak), ...point,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const ticks = compact ? [] : [...new Set([0, Math.floor((history.length - 1) / 3), Math.floor((history.length - 1) * 2 / 3), history.length - 1])];
  return <svg className={`search-chart ${compact ? 'compact' : ''}`} viewBox={`0 0 ${width} ${height + (compact ? 15 : 45)}`} role="img" aria-label={`${item.name}最近${days}天逐日搜索量`}>
    <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity=".16" /><stop offset="100%" stopColor={chartColor} stopOpacity="0" /></linearGradient></defs>
    {!compact && [0, .5, 1].map((ratio) => <g key={ratio}><line x1={padding} x2={width - 12} y1={10 + height * ratio} y2={10 + height * ratio} stroke="var(--line)" strokeDasharray="4 5" /><text x="0" y={14 + height * ratio} fill="var(--muted)" fontSize="12">{formatNumber(Math.round(peak * (1 - ratio)))}</text></g>)}
    <polygon points={`${padding},${height + 10} ${line} ${width - 12},${height + 10}`} fill={`url(#${gradientId})`} />
    <polyline points={line} fill="none" stroke={chartColor} strokeWidth={compact ? 5 : 2.6} strokeLinecap="round" strokeLinejoin="round" />
    {!compact && points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="3.6" fill="#fff" stroke={chartColor} strokeWidth="2"><title>{point.date}：搜索量 {formatNumber(point.value)}</title></circle>)}
    {ticks.map((index) => <text key={index} x={points[index].x} y={height + 37} textAnchor={index === 0 ? 'start' : index === history.length - 1 ? 'end' : 'middle'} fontSize="12" fill="var(--muted)">{points[index].date.slice(5).replace('-', '/')}</text>)}
  </svg>;
}

/** 总览卡片使用当前排序周期的增长和名次，同时支持单项加入报告。 */
export function TrendCard({ item, days, growthWindow, overrides, selected, onToggle, onOpen }) {
  const values = metrics(item);
  return <article className={`trend-card ${selected ? 'is-selected' : ''}`}>
    <div className="card-art"><ProductArt item={item} /><span className="card-rank">{String(item.rank).padStart(2, '0')}</span><div className="card-badge"><LevelBadge item={item} overrides={overrides} /></div></div>
    <div className="card-body"><span className="trend-category">{item.category}</span><button className="link-button trend-title" onClick={() => onOpen(item)}>{item.name}<Icon name="arrow" size={15} /></button>
      <div className="card-metrics"><div><span>最新日搜索量</span><strong>{formatNumber(values.volume)}</strong></div><div><span>{growthWindow === 'week' ? '近 7 天' : '近 1 天'}增长</span><strong className="growth-up">{formatGrowth(values[growthWindow])}</strong></div></div>
      <SearchChart item={item} days={days} compact />
      <div className="card-rank-change"><span>增长榜排名变化</span><RankDelta value={item.rankDelta} /></div>
      <div className="card-foot"><button className="card-detail-button" onClick={() => onOpen(item)} aria-label={`查看${item.name}详情`}>查看详情</button><button className={`report-check ${selected ? 'checked' : ''}`} onClick={() => onToggle(item.id)} aria-pressed={selected} aria-label={`${selected ? '移除' : '加入'}${item.name}报告`}><Icon name={selected ? 'check' : 'plus'} size={13} />{selected ? '已加入' : '加入报告'}</button></div>
    </div>
  </article>;
}

/** 品类榜过滤到自身层级，不自动下钻成尚未确认的细分品类。 */
export function RankTable({ items, type, overrides, growthWindow, selectedIds, onOpen, onToggle }) {
  return <div className="table-wrap"><table><thead><tr><th>排名</th><th>趋势{TYPE_LABELS[type]}</th><th>关联品类</th><th>最新日搜索量</th><th>{growthWindow === 'week' ? '近 7 天' : '近 1 天'}增长率</th><th>趋势等级</th><th>排名变化</th><th>报告操作</th></tr></thead><tbody>
    {items.map((item) => <tr key={item.id}><td><span className={`table-rank rank-${item.rank}`}>{String(item.rank).padStart(2, '0')}</span></td><td><button className="link-button table-name" onClick={() => onOpen(item)}>{item.name}<Icon name="arrow" size={13} /></button></td><td><span className="category-pill">{item.category}</span></td><td>{formatNumber(metrics(item).volume)}</td><td className="growth-up">{formatGrowth(metrics(item)[growthWindow])}</td><td><LevelBadge item={item} overrides={overrides} /></td><td><RankDelta value={item.rankDelta} /></td><td><button className={`report-check ${selectedIds.includes(item.id) ? 'checked' : ''}`} onClick={() => onToggle(item.id)} aria-pressed={selectedIds.includes(item.id)} aria-label={`${selectedIds.includes(item.id) ? '移除' : '加入'}${item.name}报告`}><Icon name={selectedIds.includes(item.id) ? 'check' : 'plus'} size={15} />{selectedIds.includes(item.id) ? '已加入' : '加入报告'}</button></td></tr>)}
    {!items.length && <tr><td colSpan="8" className="empty-state">没有符合筛选的趋势，试试其他品类或搜索词。</td></tr>}
  </tbody></table></div>;
}

/** 匹配结果仅展示近 7 天数据；标签按 fixture 的冒号前维度着色，未知维度保留默认色。 */
export function ProductTable({ item }) {
  const products = getOwnProducts(item);
  return <div className="table-wrap"><table className="product-table"><thead><tr><th>自家相似商品</th><th>匹配依据</th><th>近 7 天点击量</th><th>成交单数</th><th>点击转化率</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><span className="product-id">{product.id}</span></td><td><div className="match-reasons">{product.matchReasons.map((reason) => <span key={reason} data-dimension={reason.split('：')[0]}>{reason}</span>)}</div></td><td>{formatNumber(product.clicks)}</td><td>{product.orders}</td><td>{product.clicks > 0 ? `${(product.orders / product.clicks * 100).toFixed(2)}%` : '暂无可比数据'}</td></tr>)}{!products.length && <tr><td colSpan="5" className="empty-state">暂无相似商品样本。无匹配不代表商品表现差。</td></tr>}</tbody></table></div>;
}

/**
 * 模态容器隔离焦点、支持 Escape 和遮罩关闭；关闭时把焦点还给触发按钮。
 * 后台设置 inert，防止键盘与读屏操作背景；稳定 onClose 避免状态更新重置焦点。
 * 恢复焦点使用 preventScroll，保持用户关闭弹窗前的浏览位置。
 */
export function Modal({ title, onClose, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background = [...document.querySelectorAll('.app-shell > :not(.modal-backdrop)')];
    const oldInert = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    /** 键盘处理只对已打开的模态生效，焦点列表按实时 DOM 重算以覆盖隐藏/恢复操作。 */
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select, [tabindex="0"]')].filter((element) => element.getClientRects().length);
      const first = focusable[0];
      const last = focusable.at(-1);
      const outside = !ref.current.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current || outside)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current || outside)) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = oldOverflow; background.forEach((element, index) => { element.inert = oldInert[index]; }); document.removeEventListener('keydown', handleKey); previous?.focus({ preventScroll: true }); };
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section ref={ref} tabIndex={-1} className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>{children}</section></div>;
}

/** 单个报告章节使用同一详情数据，隐藏内容也从最终打印 DOM 中移除。 */
function ReportItem({ item, days, overrides, hiddenSections }) {
  return <article className="report-detail"><div className="report-detail-title"><div><span className="eyebrow">{TYPE_LABELS[item.type]} · {item.category}</span><h3>{item.name}</h3></div><LevelBadge item={item} overrides={overrides} /></div>
    <div className="report-stats"><span>最新日搜索量 <b>{formatNumber(metrics(item).volume)}</b></span><span>近 1 天 <b className="growth-up">{formatGrowth(metrics(item).day)}</b></span><span>近 7 天 <b className="growth-up">{formatGrowth(metrics(item).week)}</b></span></div>
    {!hiddenSections.includes('reason') && <p className="report-reason">{explainTrend(item)}{overrides[item.id] && ` 展示等级经运营调整为“${overrides[item.id]}”。`}</p>}
    {!hiddenSections.includes('chart') && <SearchChart item={item} days={days} />}
    {!hiddenSections.includes('keywords') && <p className="report-keywords">关联搜索词：{item.keywords.join('、')}</p>}
    <p className="report-market">大盘参考：{item.representative.name} · {item.representative.listName}第 {item.representative.rank} 名</p>
    {!hiddenSections.includes('products') && <ProductTable item={item} />}
  </article>;
}

/**
 * PDF 预览只提供组内排序、内容隐藏/恢复和打印导出。
 * browser print 可选择“另存为 PDF”；本组件不宣称已生成文件、不请求导出服务。
 */
export function ReportModal({ items, days, overrides, hiddenIds, hiddenSections, onMove, onToggleHidden, onToggleSection, onClose }) {
  const groups = groupReport(items);
  const visible = items.filter((item) => !hiddenIds.includes(item.id));
  /** 浏览器生成 PDF 保留当前预览 DOM 和隐藏状态；打印结束恢复工作台标题。 */
  function generateReport() {
    const oldTitle = document.title;
    document.title = `女装趋势机会报告_${DATA_DATE}_MOCK`;
    window.print();
    document.title = oldTitle;
  }
  return <Modal title="趋势机会报告预览" onClose={onClose} className="report-modal">
    <div className="modal-head no-print"><div><span className="eyebrow">REPORT PREVIEW</span><h2>报告预览</h2><p>调整顺序、隐藏内容，确认后生成 PDF。</p></div><button className="close-button" aria-label="关闭报告预览" onClick={onClose}><Icon name="close" /></button></div>
    <div className="report-controls no-print"><div className="report-controls-head"><strong>{visible.length} / {items.length} 个趋势项</strong><span>固定品类 → 款式 → 关键词，支持组内排序</span></div>
      {groups.map((group) => <div className="report-selection-group" key={group.type}><span className="report-group-label">{group.label}</span>{group.items.map((item, index) => <div className={`report-row ${hiddenIds.includes(item.id) ? 'hidden-item' : ''}`} key={item.id}><span className="report-index">{String(index + 1).padStart(2, '0')}</span><strong>{item.name}</strong><div className="row-actions"><button aria-label={`上移${item.name}`} disabled={!index} onClick={() => onMove(item.id, -1)}><Icon name="up" size={14} /></button><button aria-label={`下移${item.name}`} disabled={index === group.items.length - 1} onClick={() => onMove(item.id, 1)}><Icon name="down" size={14} /></button><button className="hide-action" onClick={() => onToggleHidden(item.id)}>{hiddenIds.includes(item.id) ? '恢复' : '隐藏'}</button></div></div>)}</div>)}
      <div className="section-toggles"><span>显示内容</span>{[['chart', '走势'], ['reason', '趋势解释'], ['keywords', '搜索词'], ['products', '相似商品']].map(([key, label]) => <label key={key}><input type="checkbox" checked={!hiddenSections.includes(key)} onChange={() => onToggleSection(key)} />{label}</label>)}</div>
    </div>
    {visible.length ? <div className="report-paper"><div className="report-cover"><span className="eyebrow">TREND LAB · VIPSHOP WOMENSWEAR</span><h2>女装趋势机会报告</h2><p>数据日期 {DATA_DATE} · {visible.length} 个趋势项 · MOCK 示例数据</p></div>{groupReport(visible).map((group) => <section className="report-chapter" key={group.type}><h2>{group.label}趋势</h2>{group.items.map((item) => <ReportItem key={item.id} item={item} days={days} overrides={overrides} hiddenSections={hiddenSections} />)}</section>)}<p className="report-disclaimer">数据更新于 {UPDATED_AT}。本报告使用本地模拟数据，仅用于方案预览。自家表现由运营判断。</p></div> : <div className="empty-state report-empty">{items.length ? '所有趋势项已隐藏，可以点击“恢复”继续预览。' : '还没有选择趋势项。返回榜单，点击“加入报告”开始筛选。'}</div>}
    <div className="modal-foot no-print"><span>点击生成后，在打印窗口选择“另存为 PDF”。</span><button className="secondary-button" onClick={onClose}>继续筛选</button><button className="primary-button" onClick={generateReport} disabled={!visible.length}><Icon name="download" size={16} />生成 PDF</button></div>
  </Modal>;
}

