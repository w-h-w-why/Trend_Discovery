/**
 * 白底森系绿工作台：总览与榜单原地切换，所有下钻在单一弹窗内完成。
 * 弹窗关闭保留背景位置、筛选与报告选择；关联项使用弹窗内历史返回，避免叠窗。
 * 本模块只管理会话状态，不接 API；指标与系统等级继续由 domain 的样本口径派生。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DATA_DATE, UPDATED_AT, allTrends, categories, keywords, ownProducts, styles } from './mockData';
import { LEVELS, TYPE_LABELS, explainTrend, formatGrowth, formatNumber, getOwnProducts, metrics, moveReportItem, rankItems, systemLevel } from './domain';
import { Icon, LevelBadge, Modal, ProductArt, ProductTable, RankDelta, RankTable, ReportModal, SearchChart, TrendCard } from './components';

const tabs = [{ id: 'style', label: '款式榜单' }, { id: 'category', label: '品类榜单' }, { id: 'keyword', label: '关键词榜单' }];

/** options 为 [值, 文案]；排序与图表分别调用，防止图表天数被误当成增长周期。 */
function WindowSwitch({ value, onChange, options, label }) {
  return <div className="window-control"><span>{label}</span><div className="segmented">{options.map(([key, text]) => <button key={key} className={value === key ? 'active' : ''} aria-pressed={value === key} onClick={() => onChange(key)}>{text}</button>)}</div></div>;
}

/**
 * 详情内按任务拆分信息，item 始终是用户所点主体，关联词只替换当前弹窗内容。
 * activePane 切换不改变背景滚动；商品只展示匹配与数值，不给自动跑输结论。
 */
function TrendDetail({ item, activePane, days, setDays, growthWindow, ranked, overrides, selectedIds, onToggle, onOpen, onAdjust }) {
  const relatedKeywords = ranked.keyword.filter((keyword) => item.type === 'category' ? keyword.category === item.category : keyword.styleId === (item.styleId ?? item.id));
  const relatedStyles = ranked.style.filter((style) => item.type === 'category' ? style.category === item.category : style.id === (item.styleId ?? item.id));
  const values = metrics(item);
  if (activePane === 'styles' || activePane === 'keywords') {
    const type = activePane === 'styles' ? 'style' : 'keyword';
    return <div className="related-pane"><p className="pane-note">{item.name} · {activePane === 'styles' ? '相关款式' : '热门搜索词'} · 按{growthWindow === 'week' ? '近 7 天' : '近 1 天'}增长率排序。点击名称在当前弹窗查看详情。</p><RankTable items={type === 'style' ? relatedStyles : relatedKeywords} type={type} overrides={overrides} growthWindow={growthWindow} selectedIds={selectedIds} onOpen={onOpen} onToggle={onToggle} /></div>;
  }
  if (activePane === 'products') return <div className="products-pane"><div className="subsection-title"><h3>大盘代表商品</h3><span>独立大盘榜单排名</span></div><div className="market-reference"><ProductArt item={item} small /><div><span className="market-label">{item.representative.brand} · 商品示意</span><strong>{item.representative.name}</strong><span>{item.representative.listName} · {DATA_DATE}</span></div><div className="market-rank"><span>大盘商品榜</span><strong>#{item.representative.rank}</strong></div></div><div className="subsection-title"><h3>自家相似商品 <span className="section-count">{getOwnProducts(item).length} 件</span></h3><span>近 7 天表现</span></div><ProductTable item={item} /><p className="product-note">匹配依据包含品类、标题词、属性词和款式词。点击转化率 = 成交单数 / 点击量，表现由运营判断。</p></div>;
  return <div className="signals-pane">
    <div className="detail-metrics"><div><span>最新日搜索量</span><strong>{formatNumber(values.volume)}</strong></div><div><span>近 1 天增长率</span><strong className="growth-up">{formatGrowth(values.day)}</strong></div><div><span>近 7 天增长率</span><strong className="growth-up">{formatGrowth(values.week)}</strong></div><div><span>{growthWindow === 'week' ? '近 7 天' : '近 1 天'}增长榜</span><strong>#{item.rank} <RankDelta value={item.rankDelta} /></strong></div></div>
    <div className="chart-head"><h3>搜索热度走势</h3><WindowSwitch label="展示范围" value={days} onChange={setDays} options={[[7, '7 天'], [14, '14 天'], [30, '30 天']]} /></div><SearchChart item={item} days={days} /><p className="chart-caption">逐日搜索量 · 悬停节点查看数值 · 图表范围不改变增长率和排序周期</p>
    <div className="signal-bottom"><section><h3>为什么被判定为趋势？</h3><div className="reason-main"><p>{explainTrend(item)}</p></div><div className="level-adjust"><label htmlFor="level-adjust">展示等级</label><select id="level-adjust" value={overrides[item.id] ?? 'system'} onChange={(event) => onAdjust(event.target.value)}><option value="system">系统判定 · {systemLevel(item)}</option>{LEVELS.map((level) => <option key={level} value={level}>人工调整 · {level}</option>)}</select><span>仅调整展示等级，原始判定依据保留。</span></div></section><section><h3>{item.type === 'keyword' ? '关联信息' : '主要带动搜索词'} <small>近 7 天增长率</small></h3>{item.type === 'keyword' ? <div className="keyword-context"><span>所属品类：{item.category}</span>{relatedStyles.map((style) => <button className="secondary-button" key={style.id} onClick={() => onOpen(style)}>查看{style.name}<Icon name="arrow" size={14} /></button>)}</div> : <div className="keyword-list">{relatedKeywords.slice(0, 3).map((keyword) => <button key={keyword.id} onClick={() => onOpen(keyword)}><span>{keyword.name}<Icon name="arrow" size={14} /></span><b>{formatGrowth(metrics(keyword).week)}</b></button>)}</div>}</section></div>
  </div>;
}

/** 页面、弹窗与报告共享同一组会话选择；刷新才重置，关闭弹窗不清理业务状态。 */
export default function App() {
  const [view, setView] = useState('overview');
  const [days, setDays] = useState(7);
  const [growthWindow, setGrowthWindow] = useState('week');
  const [activeTab, setActiveTab] = useState('style');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [levelFilter, setLevelFilter] = useState('全部');
  const [query, setQuery] = useState('');
  const [focusedId, setFocusedId] = useState(styles[0].id);
  const [detailPane, setDetailPane] = useState('signals');
  const [detailHistory, setDetailHistory] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [hiddenSections, setHiddenSections] = useState([]);
  const detailHeading = useRef(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  // 关联下钻会移除刚点击的行；把焦点交给新主体标题，避免焦点落到页面根部。
  useEffect(() => { detailHeading.current?.focus({ preventScroll: true }); }, [focusedId]);
  const ranked = useMemo(() => ({ style: rankItems(styles, growthWindow), category: rankItems(categories, growthWindow), keyword: rankItems(keywords, growthWindow) }), [growthWindow]);
  const focusedItem = Object.values(ranked).flat().find((item) => item.id === focusedId) ?? ranked.style[0];
  const visibleRows = ranked[activeTab].filter((item) => (categoryFilter === '全部' || item.category === categoryFilter)
    && (levelFilter === '全部' || (overrides[item.id] ?? systemLevel(item)) === levelFilter)
    && `${item.name} ${item.category} ${item.keywords.join(' ')}`.includes(query.trim()));
  const reportItems = selectedIds.map((id) => allTrends.find((item) => item.id === id)).filter(Boolean);
  const hotCategories = ranked.category.slice(0, 3);
  const explosiveCount = styles.filter((item) => (overrides[item.id] ?? systemLevel(item)) === '爆发').length;
  const detailTabs = [{ id: 'signals', label: '趋势依据' }, ...(focusedItem.type === 'category' ? [{ id: 'styles', label: '相关款式' }] : []), { id: 'keywords', label: '搜索词' }, { id: 'products', label: `商品匹配（${getOwnProducts(focusedItem).length}）` }];

  /** 切换页面不改变任一视图的滚动位置；两个视图保持挂载，仅隐藏非当前视图。 */
  function changeView(nextView) {
    setView(nextView);
  }

  /** 同 id 不重复；取消后清除隐藏标记，使重新加入的项可见。 */
  function toggleReport(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id]);
    setHiddenIds((current) => current.filter((hidden) => hidden !== id));
  }

  /** 品类、款式、关键词都进入同一弹窗；关联下钻保存主体与页签供原地返回。 */
  function openDetail(item) {
    if (dialog === 'detail' && item.id === focusedId) return;
    if (dialog === 'detail') setDetailHistory((current) => [...current, { id: focusedId, pane: detailPane }]);
    else setDetailHistory([]);
    setFocusedId(item.id);
    setDetailPane('signals');
    setDialog('detail');
  }

  /** 仅回退弹窗内导航，空历史无副作用；不变更后台筛选或位置。 */
  function backDetail() {
    const previous = detailHistory.at(-1);
    if (!previous) return;
    setFocusedId(previous.id);
    setDetailPane(previous.pane);
    setDetailHistory((current) => current.slice(0, -1));
  }

  /** 人工覆盖只改会话展示；system 删除覆盖，系统依据始终由原始数据生成。 */
  function adjustLevel(value) {
    setOverrides((current) => {
      const next = { ...current };
      if (value === 'system') delete next[focusedId];
      else next[focusedId] = value;
      return next;
    });
  }

  /** 同类型组内移动；边界处理由 domain 保证，未知项从输入中过滤。 */
  function moveReport(id, direction) {
    setSelectedIds((current) => moveReportItem(current.map((key) => allTrends.find((item) => item.id === key)).filter(Boolean), id, direction).map((item) => item.id));
  }

  /** 隐藏与选择互相独立，关闭报告仍能恢复项。 */
  function toggleHidden(id) {
    setHiddenIds((current) => current.includes(id) ? current.filter((key) => key !== id) : [...current, id]);
  }

  /** 报告内容开关同时作用于预览和打印正文，不请求导出服务。 */
  function toggleSection(key) {
    setHiddenSections((current) => current.includes(key) ? current.filter((section) => section !== key) : [...current, key]);
  }

  /** 重置榜单条件不改变周期、选择和人工等级，避免把筛选当作清空工作台。 */
  function resetFilters() {
    setCategoryFilter('全部'); setLevelFilter('全部'); setQuery('');
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Icon name="trend" size={24} /></div><div><strong>Trend Lab<span className="brand-period">.</span></strong><span>女装趋势发现</span></div></div>
      <div className="workspace-switch"><span className="workspace-dot" /><span>唯品会 · 女装</span></div>
      <nav className="main-nav" aria-label="工作台导航"><span className="nav-label">工作台</span><button className={`nav-item ${view === 'overview' ? 'active' : ''}`} aria-current={view === 'overview' ? 'page' : undefined} onClick={() => changeView('overview')}><Icon name="trend" />趋势总览</button><button className={`nav-item ${view === 'rankings' ? 'active' : ''}`} aria-current={view === 'rankings' ? 'page' : undefined} onClick={() => changeView('rankings')}><Icon name="grid" />趋势榜单</button><button className="nav-item" onClick={() => setDialog('report')}><Icon name="report" />机会报告<em>{selectedIds.length}</em></button><span className="nav-label second">辅助信息</span><button className="nav-item" onClick={() => setDialog('info')}><Icon name="data" />数据说明</button></nav>
      <div className="sidebar-note"><Icon name="spark" /><strong>每天，把趋势看清楚</strong><p>发现趋势 → 查看依据<br />筛选内容 → 生成报告</p></div>
      <div className="sidebar-foot"><div className="api-status"><span className="status-dot" />模拟数据预览</div><div className="user-profile"><div className="avatar">运</div><div><strong>运营工作台</strong><span>唯品会女装</span></div></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>女装工作台</span><b>/</b><strong>{view === 'overview' ? '趋势总览' : '趋势榜单'}</strong></div><div className="topbar-actions"><span className="mock-badge">模拟数据</span><span className="data-badge"><Icon name="clock" size={14} />更新 {UPDATED_AT}</span></div></header>
      <section className="page-content" hidden={view !== 'overview'} aria-label="趋势总览视图">
        <div className="hero-row"><div><div className="eyebrow">VIPSHOP / WOMENSWEAR</div><h1>趋势总览</h1><p>先看增长最快的品类与款式，再查看依据和自家商品覆盖。</p></div><button className="primary-button" onClick={() => setDialog('report')}><Icon name="report" size={17} />机会报告<span className="button-count">{selectedIds.length}</span></button></div>
        <div className="mock-banner"><span><Icon name="data" size={15} />当前为模拟数据，供查看页面效果和交互。</span><button onClick={() => setDialog('info')}>数据口径<Icon name="arrow" size={14} /></button></div>
        <div className="summary-strip"><div><span>趋势款式</span><strong>{styles.length}<small>款</small></strong></div><div><span>重点品类</span><strong>{hotCategories.length}<small>个</small></strong></div><div><span>爆发款式</span><strong>{explosiveCount}<small>款</small></strong></div><div className="summary-period"><span>榜单排序周期</span><WindowSwitch value={growthWindow} onChange={setGrowthWindow} options={[["day", '近 1 天'], ['week', '近 7 天']]} /></div></div>
        <div className="section-head"><div><h2>升温品类 <span className="section-count">TOP 3</span></h2><p>点击查看品类趋势、相关款式和搜索词</p></div><button className="text-button" onClick={() => { resetFilters(); setActiveTab('category'); changeView('rankings'); }}>全部品类<Icon name="arrow" size={15} /></button></div>
        <div className="category-grid" aria-label="趋势品类 Top 3">{hotCategories.map((item) => <article className="category-card" key={item.id}><div className="category-card-top"><span className="category-number">0{item.rank}</span><LevelBadge item={item} overrides={overrides} /></div><div className="category-main"><div><h3>{item.name}</h3><span className="category-volume">最新日搜索量 {formatNumber(metrics(item).volume)}</span></div><strong className="category-growth">{formatGrowth(metrics(item)[growthWindow])}<small>{growthWindow === 'week' ? '近 7 天' : '近 1 天'}增长率</small></strong></div><div className="category-terms">{item.keywords.slice(0, 3).map((term) => <span key={term}>{term}</span>)}</div><button className="category-detail" onClick={() => openDetail(item)}>查看品类<Icon name="arrow" size={15} /></button></article>)}</div>
        <div className="section-head"><div><h2>趋势款式 <span className="section-count">TOP 10</span></h2><p>按{growthWindow === 'week' ? '近 7 天' : '近 1 天'}搜索增长率排序 · 数据日期 {DATA_DATE}</p></div><WindowSwitch label="折线范围" value={days} onChange={setDays} options={[[7, '7 天'], [14, '14 天'], [30, '30 天']]} /></div>
        <div className="trend-grid" aria-label="趋势款式 Top 10">{ranked.style.slice(0, 10).map((item) => <TrendCard key={item.id} item={item} days={days} growthWindow={growthWindow} overrides={overrides} selected={selectedIds.includes(item.id)} onToggle={toggleReport} onOpen={openDetail} />)}</div>
        <footer className="page-footer"><span>本页展示 3 个品类、10 个款式</span><button className="text-button" onClick={() => { resetFilters(); setActiveTab('style'); changeView('rankings'); }}>查看完整趋势榜单<Icon name="arrow" size={15} /></button></footer>
      </section>
      <section className="page-content" hidden={view !== 'rankings'} aria-label="趋势榜单视图">
        <div className="hero-row"><div><div className="eyebrow">TREND RANKINGS</div><h1>趋势榜单</h1><p>按品类筛选款式和关键词，点击趋势查看详情，选择需要的报告内容。</p></div><button className="primary-button" onClick={() => setDialog('report')}><Icon name="report" size={17} />机会报告<span className="button-count">{selectedIds.length}</span></button></div>
        <div className="discovery-toolbar"><span>唯品会 · 女装 / {categoryFilter === '全部' ? '全部品类' : categoryFilter}</span><WindowSwitch label="按增长率排序" value={growthWindow} onChange={setGrowthWindow} options={[["day", '近 1 天'], ['week', '近 7 天']]} /></div>
        <div className="panel ranking-panel"><div className="tabs" role="tablist" aria-label="趋势榜单类型">{tabs.map((tab) => <button key={tab.id} id={`tab-${tab.id}`} role="tab" aria-controls="ranking-results" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}<span>{ranked[tab.id].length}</span></button>)}</div><div className="table-filters"><label>品类<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>全部</option>{categories.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label>趋势等级<select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option>全部</option>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select></label><div className="table-search"><Icon name="search" size={16} /><input aria-label="搜索趋势" placeholder="搜索款式、品类或关键词" value={query} onChange={(event) => setQuery(event.target.value)} /></div><button className="text-button" onClick={resetFilters}>重置</button></div><div className="results-label">共 {visibleRows.length} 项{categoryFilter !== '全部' && ` · ${categoryFilter}`}<span>点击名称查看详情，加入报告后可统一整理</span></div><div id="ranking-results" role="tabpanel" aria-labelledby={`tab-${activeTab}`}><RankTable items={visibleRows} type={activeTab} overrides={overrides} growthWindow={growthWindow} selectedIds={selectedIds} onOpen={openDetail} onToggle={toggleReport} /></div><div className="table-bottom"><span>排名为全站搜索增长榜；筛选后保留全站名次。</span><span>更新 {UPDATED_AT}</span></div></div>
      </section>
    </main>
    {selectedIds.length > 0 && !dialog && <div className="selection-dock"><Icon name="check" size={18} /><span>已加入 <b>{selectedIds.length}</b> 项</span><button onClick={() => setDialog('report')}>整理并生成报告<Icon name="arrow" size={16} /></button></div>}
    {dialog === 'detail' && <Modal title={`${focusedItem.name}趋势详情`} onClose={closeDialog} className="detail-modal"><div className="modal-head"><div>{detailHistory.length > 0 && <button className="detail-back text-button" onClick={backDetail}><Icon name="arrow" size={14} />返回上一趋势</button>}<span className="eyebrow">{TYPE_LABELS[focusedItem.type]} / {focusedItem.category}</span><h2 ref={detailHeading} tabIndex={-1}>{focusedItem.name}<LevelBadge item={focusedItem} overrides={overrides} /></h2><p>数据更新 {UPDATED_AT} · 模拟数据</p></div><div className="modal-head-actions"><button className={`secondary-button ${selectedIds.includes(focusedId) ? 'selected-button' : ''}`} onClick={() => toggleReport(focusedId)} aria-pressed={selectedIds.includes(focusedId)}><Icon name={selectedIds.includes(focusedId) ? 'check' : 'plus'} size={15} />{selectedIds.includes(focusedId) ? '已加入报告' : '加入报告'}</button><button className="close-button" aria-label="关闭趋势详情" onClick={closeDialog}><Icon name="close" /></button></div></div><div className="tabs detail-tabs" role="tablist" aria-label="详情内容">{detailTabs.map((tab) => <button key={tab.id} id={`detail-tab-${tab.id}`} role="tab" aria-controls="detail-content" aria-selected={detailPane === tab.id} className={detailPane === tab.id ? 'active' : ''} onClick={() => setDetailPane(tab.id)}>{tab.label}</button>)}</div><div key={`${focusedId}-${detailPane}`} className="detail-body" id="detail-content" role="tabpanel" aria-labelledby={`detail-tab-${detailPane}`}><TrendDetail item={focusedItem} activePane={detailPane} days={days} setDays={setDays} growthWindow={growthWindow} ranked={ranked} overrides={overrides} selectedIds={selectedIds} onToggle={toggleReport} onOpen={openDetail} onAdjust={adjustLevel} /></div><div className="detail-foot"><span>关闭后保留浏览位置与筛选条件</span><button className="secondary-button" onClick={closeDialog}>完成查看</button></div></Modal>}
    {dialog === 'report' && <ReportModal items={reportItems} days={days} overrides={overrides} hiddenIds={hiddenIds} hiddenSections={hiddenSections} onMove={moveReport} onToggleHidden={toggleHidden} onToggleSection={toggleSection} onClose={closeDialog} />}
    {dialog === 'info' && <Modal title="数据说明" onClose={closeDialog} className="info-modal"><div className="modal-head"><div><span className="eyebrow">DATA NOTES</span><h2>数据说明</h2></div><button className="close-button" aria-label="关闭数据说明" onClick={closeDialog}><Icon name="close" /></button></div><div className="data-notes"><p><b>模拟数据：</b>{styles.length} 个款式、{categories.length} 个品类、{keywords.length} 个搜索词、{ownProducts.length} 件自家商品。逐日样本共 30 天，无 API 请求。</p><p><b>增长率：</b>近 1 天对比前一日；近 7 天总量对比前 7 天总量。最新日搜索量与周期增长分开展示。</p><p><b>图表范围：</b>7/14/30 天切换只改变走势窗口，排序使用日/周周期。</p><p><b>趋势等级：</b>日增长超过 100% 为爆发；否则周增长超过 30% 为增长；其余样本归为稳定。人工调整保留系统依据。</p><p><b>两种排名：</b>增长榜和变化为本系统搜索增长排名；“大盘商品榜”是独立参考数据。</p><p><b>自家表现：</b>展示匹配、点击和成交数据，由运营判断，不自动标记“没跑过大盘”。</p><p><b>保存范围：</b>本次页面会话中保留选择、调整和隐藏结果。刷新恢复初始状态；生产口径、API 与自动推送仍待后续确认。</p></div></Modal>}
  </div>;
}

