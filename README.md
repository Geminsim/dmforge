# DMForge

DMForge 是一个面向桌面跑团主持人（DM）的本地优先战役辅助台。它整合了战术地图、角色与物品管理、回合战斗、掷骰、日志、浮动笔记、Excel 角色卡和局域网玩家展示端。

## 当前开发阶段

项目进入“稳定化里程碑”，暂缓增加大型功能。当前优先级依次为：

1. 保证 Lint、测试和生产构建持续通过。
2. 加固存档、局域网同步和外部 Excel 文件输入。
3. 拆分大型组件，补充战斗轮转、地图移动和同步冲突测试。
4. 完成稳定性验证后，再考虑账户、数据库或公网协作能力。

## 本地运行

需要 Node.js 22 或兼容版本。

### Windows 一键启动（推荐）

双击 `run.bat` 即可。应用默认开启局域网能力，不再区分两个启动模式：

- 本机浏览器会通过启动链接自动取得同步令牌。
- 启动窗口会显示可分享给其他设备的 `Paired LAN URL`。
- 其他设备打开配对链接后会自动保存令牌，URL 中的令牌随即被清除。
- 如果同步服务不可达或令牌无效，应用自动降级为单机模式，继续使用本地存档并在后台重试。

首次运行会自动执行依赖安装和生产构建；之后直接启动独立 Node 服务。同步令牌会生成在 `.dmforge-sync-token`，请勿分享给不受信任的人，也不要删除正在使用的令牌文件。

关闭启动窗口或按 `Ctrl+C` 即可停止服务。

### 命令行运行

```bash
npm ci
npm run dev
```

浏览器访问 `http://localhost:5173`。直接运行命令行服务时，可通过以下变量决定监听范围：

局域网模式必须同时设置监听地址与同步令牌：

```powershell
$env:DMFORGE_HOST='0.0.0.0'
$env:DMFORGE_SYNC_TOKEN='请替换为足够长的随机令牌'
npm run dev
```

其他设备可以在“系统设置”中输入同一个令牌，也可以使用带 `#syncToken=...` 的配对链接。未设置令牌时，服务拒绝监听非本机地址。

Windows + Docker 用户仍可运行 `run-docker.bat` 启动生产容器，但普通本地与便携启动均不依赖 Docker。

## 构建 Windows 便携版

在已安装 Node.js 的开发电脑上运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-portable.ps1
```

构建脚本会先运行完整质量门禁，然后生成：

```text
release/DMForge-portable/
release/DMForge-portable-windows-x64.zip
```

把 ZIP 解压到普通可写目录后，用户可直接双击 `run.bat`，不需要选择模式，也不需要安装 Node.js、npm 或 Docker。便携包内含构建机器当前使用的 Windows x64 `node.exe`。

便携版的战役状态、备份和 `.dmforge-sync-token` 都保存在解压后的应用目录中。升级时应先备份以下文件：

- `campaign_state.json`
- `campaign_state_backup.json`
- `.dmforge-sync-token`

不要把便携包安装在只读目录（例如受保护的 `Program Files` 子目录），否则无法保存战役状态。

## 验证

```bash
npm run verify
```

该命令依次运行 ESLint、Node 测试和 Vite 生产构建。

## 数据与同步

- 浏览器状态保存在 `localStorage`。
- 独立 Node 服务通过 `/api/campaign` 将状态写入 `campaign_state.json`。
- 覆盖前会将旧状态复制到 `campaign_state_backup.json`。
- 设置面板支持导入和导出完整 JSON 存档。
- 局域网同步使用 Bearer Token；写入使用 ETag/If-Match 检测并发冲突和原子替换。
- 战役 JSON 上限为 10MB，并会校验必要集合、数量和危险对象键。

## Excel 安全限制

仅支持 `.xlsx`、`.xls`、`.xlsm` 和 `.xlsb`，单文件最大 2MB，最多 50 个工作表；渲染范围还会限制为最多 501 行、101 列。`xlsx` 依赖目前仍有上游未修复的安全公告，因此只应导入可信来源的工作簿。

## 已知限制

- 当前是单进程、文件式局域网同步，不提供账户、权限或完善的并发合并。
- UI 组件仍然偏大，后续应优先拆分 `MapSystem`、`App` 和 `ExcelImporter`。
- 尚缺浏览器端到端测试；现有测试主要覆盖存档边界校验。
- 生产构建的主 JavaScript 包较大，后续需要按地图和 Excel 模块进行懒加载拆包。
