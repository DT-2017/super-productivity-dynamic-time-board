# Dynamic Time Board for Super Productivity

[中文](#中文说明) | [English](#english)

## 中文说明

一款适用于 [Super Productivity](https://github.com/super-productivity/super-productivity) 的只读动态时间规划看板插件。自动按**任务截止日期**分为：

- **今天**：今天到期与已经逾期的未完成任务
- **本周**：明天至本周日到期的任务
- **本月**：本周之后至本月最后一天到期的任务
- **未来**：下个月及更远时间到期的任务
- **未设置截止日期**：可展开单独查看

支持按项目筛选、手动刷新；打开看板后定期同步任务，跨日自动重新分类。界面使用中文和柔和的四列配色。

> 注意：这是**截止日期**看板，并不是 Planner 计划执行日期看板；不会更改任务、标签或截止日期。已完成任务和子任务不会显示在四列看板中。

### 安装

1. 打开 [Releases](../../releases)，下载 `SuperProductivity_DynamicTimeBoard_v1.0.1.zip`（不要解压）。
2. 在 Super Productivity 中打开 **设置 → 插件 → 选择插件文件**，选中 ZIP 并启用。
3. 点击顶栏中的 **时间规划** 打开看板。

已在 Super Productivity 19.3.1W 上由初始使用者进行基本体验测试；其他版本、平台尚未系统测试。插件使用官方 Plugin API。

### 开发和打包

这是一个原生 JavaScript + HTML 插件，无需 npm 构建。ZIP **根目录**必须包含 `manifest.json`、`plugin.js`、`index.html`：

```text
manifest.json
plugin.js
index.html
```

Windows PowerShell 打包：

```powershell
Compress-Archive -Path manifest.json,plugin.js,index.html -DestinationPath .\plugin.zip -Force
```

### 隐私与安全

插件从 Super Productivity 的插件 API 读取任务和项目数据用于本地展示；当前代码没有网络请求或修改任务操作。社区插件属于第三方代码，安装前仍应自行检查源代码。

### 已知限制

- 使用截止日期 `dueDay`（有时间的截止日期可回退至 `dueWithTime`），不读取 Planner 的排程日期。
- 看板不提供任务拖动和编辑。
- 本周以周一开始；使用本地时区。
- 未设置截止日期的任务在单独区域查看。

## English

A read-only, date-aware task board for Super Productivity, grouping incomplete top-level tasks by **due date**: Today (including overdue), This Week, This Month, Future, with an expandable Undated section. Includes a project filter and refresh button. The user interface is currently Chinese.

**Important:** This plugin groups by due date, **not** by the Planner scheduling date, and does not modify tasks.

Install the ZIP from [Releases](../../releases) through **Settings → Plugins → Choose Plugin File**. Do not unzip the download before installing.

The code is plain JavaScript and HTML; the three plugin files are packaged at the ZIP root. No build tooling is required.

## License

MIT — see [LICENSE](LICENSE).
