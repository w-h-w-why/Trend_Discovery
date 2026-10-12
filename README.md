# Trend Discovery

`Trend_Discovery` 面向唯品会女装运营，通过搜索热度增长发现品类、款式与关键词趋势，关联自家相似商品，并支持人工筛选后导出品牌方 PDF 报告。

当前处于需求整理阶段。已确认需求与验收草案见 [PRD.md](PRD.md)；首个开发交付范围、数据接入方式和技术栈仍待明确，任务状态见 [TODO.md](TODO.md)。

## 快速开始

在仓库根目录检查工作区状态：

```powershell
git status --short --branch
```

开始开发前，阅读 [PRD.md](PRD.md)，从 [TODO.md](TODO.md) 确认本次交付范围与待决规则。安装、运行和测试命令将在对应脚本或配置建立后补充。

## 目录与文档导航

- [AGENTS.md](AGENTS.md)：代理协作入口与文档维护约定。
- [PRD.md](PRD.md)：业务目标、已确认需求、数据来源、功能边界及验收草案。
- [TODO.md](TODO.md)：待确认事项、下一步和已完成任务。
- [.gitignore](.gitignore)：本地配置、缓存、虚拟环境和临时文件的忽略规则。

## 当前状态

Git 仓库已初始化，前期需求沟通已整理入文档。当前尚无源代码、依赖清单、运行入口或自动化测试；文档中的功能均未实现。

[.gitignore](.gitignore) 当前采用 Python/数据分析项目的通用规则；技术栈仍待确认。文档初始化与后续事项的验收状态以 [TODO.md](TODO.md) 为准。
