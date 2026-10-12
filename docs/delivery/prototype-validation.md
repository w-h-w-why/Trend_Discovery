# Mock 前端原型验证记录

- 日期：2026-10-12
- 范围：本地 mock 页面与交互，不包含 API、真实匹配算法或自动推送。
- 运行环境：Windows、Node.js v24.19.0、npm 11.17.0。

## 首版实跑结果（整改前）

- 依赖安装通过；[package.json](../../package.json) 与 lock 文件使用固定版本。
- `npm run build` 通过。
- `npm test` 的 7 项检查全部通过：日/周窗口、零基数及历史不足、三层级自家匹配与无匹配、等级判定、30 天品类汇总一致性、增长排名、报告组内排序边界。
- 浏览器页面可访问；控制台检查没有 error 或 warn。
- DOM 确认总览包含 10 个款式和 3 个品类；30 天切换同时更新卡片与详情图表。
- 品类下钻后，三个榜单共用品类筛选；关键词“防晒”能在针织衫范围筛选到对应搜索词，并加入报告。
- 三类趋势可以加入同一报告；人工调整的等级在报告中显示，原始增长解释仍保留。
- 组内排序、隐藏趋势项、隐藏相似商品区块、恢复内容以及关闭重开后保留状态均已验证。
- 窄屏检查保留 10 个款式，DOM 未出现页面水平溢出；检查后已恢复默认视口。
- 页面源码没有 API 请求或远程素材依赖；文档相对链接目标存在。

## 白色与浅橙 / 弹窗交互整改验证

2026-10-12，本轮修改 [工作台](../../src/App.jsx)、[组件](../../src/components.jsx) 与 [样式](../../src/styles.css)，同步 PRD、README、TODO 及本记录。首版滚动下钻已替换为弹窗流程；业务指标、mock 数据与报告分组规则未改。

- `npm run build`、`npm test` 通过，7 项计算检查通过；浏览器控制台无 error / warn。
- 白色页面与弹窗，浅橙用于选中、操作和曲线；卡片明确区分“查看详情”和“加入报告”，榜单报告操作有文字。
- 从第 10 个款式打开详情，关闭后背景 scrollTop 保持 847；焦点返回“查看钩针镂空上衣详情”。弹窗最多一个，关闭后后台 inert 恢复。
- 总览切到榜单后再切回，scrollTop 保持 654；针织衫 + 防晒关键词筛选在切换视图后保留。
- 连衣裙弹窗可查看相关款式，下钻碎花连衣裙并返回时回到相关款式页签；品类搜索词页签和匹配页签正常。
- 碎花连衣裙展示 2 件自家相似商品、命中理由与点击/成交/转化率；钩针镂空上衣展示 0 匹配提示，未自动判断表现差。
- 14/30 天走势切换正常；人工“增长”显示与原始“爆发”解释同时保留；人工等级进入报告。
- 三类共 4 项报告按品类 → 款式 → 关键词分组；下移碎花连衣裙后正文顺序同步。隐藏法式碎花裙、隐藏商品表后预览同步，关闭重开仍保留，恢复正常。
- 报告 Shift+Tab 可循环到“生成 PDF”；Escape 关闭详情正常；数据说明弹窗可打开/关闭。关联下钻后焦点移至新主体标题，防止触发节点消失导致焦点丢失。
- 390px 窄屏 DOM 宽度与 scrollWidth 均为 390，仍有 10 个款式和 3 个品类；详情头部、页签及完成按钮可见，正文独立滚动。已恢复默认视口。
- 实际 PDF 保存和分页本轮未验证，继续列在 TODO；不把预览通过等同于 PDF 导出通过。

截图：[白色浅橙总览](../../outputs/preview-white-orange.png)、[详情弹窗](../../outputs/preview-detail-white-orange.png)。

本轮注释核对：App 模块、WindowSwitch、TrendDetail、App、changeView、toggleReport、openDetail、backDetail、adjustLevel、moveReport、toggleHidden、toggleSection、resetFilters；components 模块、ProductArt、SearchChart、TrendCard、RankTable、Modal、handleKey；styles 模块与响应式/打印规则。已同步移除滚动定位的旧说明，具名函数保留意图与关键边界，匿名事件继承组件契约。

## 森系绿与标签配色调整验证

2026-10-12，用户提供森系绿色板，并继续要求“增长用红色”“标签用不一样的颜色”“绿色再深一点”。当前主题取代浅橙主题，前一节作为该版本的验证历史保留。

- 主色加深为 #276749，辅助色 #68D391；白色背景、#F0FDF4 次背景、#1A202C 正文、#718096 次要文字和 #E2E8F0 分割线。颜色集中在 [样式变量](../../src/styles.css)，SVG 曲线复用主色变量。
- 品类/款式/关键词增长率与上升名次用 #E53E3E；报告增长数值同样为红色。搜索量折线保持主绿；无排名变化与下降名次保留次要文字色。
- 标签：爆发橙、增长红、稳定蓝灰；品类紫、搜索词蓝；匹配维度按品类紫、标题词蓝、属性词绿、款式词橙区分。各标签保留文字，不靠颜色表达唯一含义。
- 浏览器读取实际样式确认：主色为 #276749、详情曲线 rgb(39,103,73)、增长数值 rgb(229,62,62)，白色弹窗、深色标题；报告主按钮和增长数值与工作台一致。
- 商品匹配页签实查四类标签颜色不同；报告加入/关闭操作正常，控制台无 error / warn。
- `npm run build` 通过；本轮仅主题和展示标记改变，没有新增或重复运行计算测试；前一轮 7 项计算测试通过。
- 同步 PRD、README、TODO 与本记录；截图见 [当前总览](../../outputs/preview-forest-green.png)、[详情](../../outputs/preview-detail-forest-green.png)。本轮未实际保存 PDF。

注释核对：App 模块的主题描述、styles 模块与语义配色规则、SearchChart 的共享色变量说明、RankDelta 的中性名次、ProductTable 的标签维度和未知维度回退、ReportItem 的同源打印规则。未改动弹窗导航或数据计算契约。

## 导航栏底色补充（2026-10-12）

- 本轮仅修改 [导航 CSS](../../src/styles.css)：#EAF2ED 灰绿底，选中 #276749 + 白字，悬停 #DBE9E0。sidebar 局部变量适配分隔线和次要文字，品牌图标、工作空间卡片和头像补充层次。
- `npm run build` 通过；浏览器实际样式为背景 rgb(234,242,237)、选中 rgb(39,103,73)、白字 rgb(255,255,255)。总览/榜单切换后的 aria-current 均正确；原有报告选择保留。
- CSS 注释说明局部变量作用域和区域层次；没有新增函数或数据行为，不新增计算测试。同步 PRD、README、TODO 和本记录；[效果截图](../../outputs/preview-sidebar-green.png)。

## 注释与交接核对（首版）

本次为可运行 mock 原型，中文注释说明模块职责、关键假设与边界；以下具名函数均已核对。匿名 JSX 事件回调沿用所属组件说明。

| 模块 | 已核对的具名函数/组件 | 关键契约 |
| --- | --- | --- |
| [入口](../../src/main.jsx)、[Vite 配置](../../vite.config.js) | 模块入口 | 本机服务、无 API proxy、React 根挂载 |
| [样本](../../src/mockData.js) | makeHistory、makeRepresentative | 固定数据日、30 天非负样本、排名仅参考 |
| [计算](../../src/domain.js) | formatNumber、growthRate、metrics、systemLevel、formatGrowth、rankItems、getOwnProducts、getRelatedStyles、explainTrend、groupReport、moveReportItem | 零基数/历史不足、原型口径、稳定排序、组内边界、无自家表现评价 |
| [组件](../../src/components.jsx) | Icon、ProductArt、LevelBadge、RankDelta、SearchChart、TrendCard、RankTable、ProductTable、Modal、handleKey、ReportItem、ReportModal、generateReport | 本地示意图、真实量轴、人工标记、空状态、焦点隔离、打印与预览同源 |
| [工作台](../../src/App.jsx) | WindowSwitch、App、toggleReport、openDetail、exploreCategory、adjustLevel、moveReport、toggleHidden、toggleSection | 日/周与图表窗口独立、详情主体准确、可恢复隐藏、会话内状态 |
| [测试](../../tests/domain.test.js) | 7 个测试回调 | 用独立手算及不变量验证边界，不复述实现 |
| [样式](../../src/styles.css) | 模块样式与媒体规则 | 窄屏保留内容、核心文字对比、独立报告打印布局 |

未发现遗留的自动自家评价、假 PDF 成功提示或“全部趋势均爆发”等与当前行为矛盾的说明。

## 未执行与限制

- 浏览器 PDF 导出入口和专用打印样式已提供，但没有实际保存 PDF 或检查其分页。内嵌浏览器可能不支持打印，必要时使用系统浏览器。
- 商品匹配和款式归纳关系预置；真实数据字段与生产规则尚未验证。
- 页面刷新重置选择、排序、隐藏与人工等级；不提供后台持久化。

初始页面截图见 [预览截图](../../outputs/preview.jpg)。运行路径见 [README](../../README.md)，后续事项见 [TODO](../../TODO.md)。
