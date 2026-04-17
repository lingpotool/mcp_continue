# MCP Continue - AI对话持续工具

<p align="center">
  <img src="assets/icon.svg" width="80" height="80" alt="MCP Continue Logo">
</p>

<p align="center">
  <strong>Professional MCP Continue tool with interactive dialog, call statistics, and modern UI</strong>
</p>

<p align="center">
  <a href="https://github.com/lingpotool/mcp_continue/releases"><img src="https://img.shields.io/github/v/release/lingpotool/mcp_continue?style=flat-square" alt="Release"></a>
  <img src="https://img.shields.io/badge/VS_Code-1.85+-007ACC?style=flat-square" alt="VS Code">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/MCP-HTTP_Mode-7c6cf0?style=flat-square" alt="MCP HTTP Mode">
</p>

---

## ✨ 功能特性

- 🔄 **对话持续控制** - AI 想要结束对话时，弹出交互式对话框让你决定是否继续
- 📊 **调用统计** - 实时追踪 MCP 调用次数、继续/结束比例、会话时长
- 🎨 **现代 UI** - 凸版浮雕风格界面，支持深色/浅色主题切换
- 🖼️ **图片上传** - 支持拖拽、粘贴、选择图片发送给 AI
- 📁 **文件引用** - 使用 @ 符号引用工作区文件
- 🌐 **多窗口支持** - 主从服务器架构，自动路由请求到正确的 VSCode 窗口
- ⚡ **一键配置** - 支持 Windsurf、Cursor 等 AI 工具的一键 MCP 配置
- 🔌 **HTTP 模式** - 纯 HTTP 传输，无需 stdio，兼容性更强

## 📦 安装

### 方式一：VSIX 安装

1. 从 [Releases](https://github.com/lingpotool/mcp_continue/releases) 下载最新的 `.vsix` 文件
2. 在 VSCode 中按 `Ctrl+Shift+P`，输入 `Extensions: Install from VSIX...`
3. 选择下载的 `.vsix` 文件

### 方式二：源码编译

```bash
git clone https://github.com/lingpotool/mcp_continue.git
cd mcp_continue
npm install
npm run compile
npm run package
```

## 🚀 快速开始

### 1. 启动 MCP 服务器

安装扩展后，MCP 服务器会自动启动。你也可以：

- 点击侧边栏的 MCP Continue 图标
- 使用命令面板 `Ctrl+Shift+P` → `MCP Continue: 启动服务器`

### 2. 配置 AI 工具

在侧边栏点击 **配置 MCP** 按钮，或手动添加以下配置：

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "mcp_continue": {
      "url": "http://localhost:52686"
    }
  }
}
```

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mcp_continue": {
      "url": "http://localhost:52686"
    }
  }
}
```

### 3. 添加规则模板

将以下规则添加到你的 AI 工具规则文件中（如 `.windsurfrules`、`.cursorrules`）：

```
⚠️ 最高优先级：每次回复结束前必须调用 mcp_continue 工具！

你必须在每次回复结束时调用 mcp_continue 工具，传递以下参数：
{
  "reason": "任务完成原因",
  "port": 52686
}
```

也可以在侧边栏点击 **复制规则模板** 获取完整模板。

## 🎮 使用方式

当 AI 想要结束对话时，会调用 `mcp_continue` 工具，此时会弹出交互式对话框：

- **继续** - 输入新指令继续对话（支持图片上传和文件引用）
- **结束** - 结束当前对话

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Enter` | 继续 |
| `Shift+Enter` | 换行 |
| `Esc` | 结束 |

## ⚙️ 配置项

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `mcpContinue.autoStart` | `true` | 启动 VSCode 时自动启动 MCP 服务器 |
| `mcpContinue.port` | `52686` | MCP HTTP 服务器端口 |
| `mcpContinue.theme` | `"dark"` | UI 主题（dark/light） |
| `mcpContinue.showStats` | `true` | 在对话框中显示调用统计 |
| `mcpContinue.allowImageUpload` | `true` | 允许图片上传 |
| `mcpContinue.allowFileReference` | `true` | 允许文件引用（@ 符号） |
| `mcpContinue.defaultReason` | `"Task completed"` | 默认结束原因 |

## 🏗️ 架构设计

```
mcp_continue/
├── src/
│   ├── extension.ts          # 扩展入口，注册命令和事件
│   ├── server/
│   │   ├── mcpServer.ts      # MCP HTTP 服务器（主从架构）
│   │   └── requestHandler.ts # MCP 协议请求处理
│   ├── services/
│   │   ├── configService.ts  # 配置管理服务
│   │   ├── portService.ts    # 端口管理服务
│   │   └── statsService.ts   # 调用统计服务
│   ├── ui/
│   │   ├── sidebarProvider.ts # 侧边栏 Webview 提供者
│   │   ├── dialogWebview.ts  # 对话框 Webview 管理
│   │   └── configPanel.ts    # MCP 配置面板
│   ├── html/
│   │   ├── dialog.ts         # 对话框 HTML 模板
│   │   └── sidebar.ts        # 侧边栏 HTML 模板
│   └── assets/
│       ├── icons.ts          # SVG 图标集合
│       ├── styles.ts         # 共享样式
│       └── themes.ts         # 主题定义
├── package.json              # 扩展清单
├── tsconfig.json             # TypeScript 配置
└── LICENSE.txt               # MIT 许可证
```

### 多窗口架构

MCP Continue 采用主从服务器架构：

- **主服务器** - 第一个启动的 VSCode 窗口，监听默认端口（52686）
- **从服务器** - 后续启动的窗口，监听随机端口并注册到主服务器
- **请求路由** - 主服务器根据 `port` 参数将请求转发到对应的从服务器

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch

# 打包 VSIX
npm run package
```

## 📄 许可证

[MIT License](LICENSE.txt)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/lingpotool">lingpotool</a>
</p>
