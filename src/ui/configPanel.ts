import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '../services/configService';
import { PortService } from '../services/portService';
import { MCPServer } from '../server/mcpServer';
import { getTheme } from '../assets/themes';
import { icon } from '../assets/icons';
import { getSharedStyles } from '../assets/styles';

const RULE_TEMPLATE = `# MCP Continue - AI对话持续规则

⚠️ 最高优先级：每次回复结束前必须调用 mcp_continue 工具！

## 核心规则

1. **完整输出** - 输出完整代码和答案，禁止省略
2. **持续执行** - 复杂任务尽量一次完成
3. **结束确认** - 想结束对话时，必须先调用 mcp_continue 工具
4. **遵守选择** - 用户选择"结束"时，必须立即停止

## 调用 mcp_continue 工具

必须同时传递 reason 和 workspace 两个参数：

\`\`\`json
{
  "reason": "任务完成原因",
  "workspace": "当前工作区的绝对路径"
}
\`\`\`

- **reason**: AI想要结束对话的原因
- **workspace**: 当前工作区根目录绝对路径（.code-workspace 文件路径或文件夹路径），确保对话框在正确的IDE窗口中弹出
`;

export function showMCPConfigPanel(
  context: vscode.ExtensionContext,
  configService: ConfigService,
  portService: PortService,
  getMCPServer: () => MCPServer | null,
): void {
  const mcpServer = getMCPServer();
  const primaryPort = mcpServer?.getPrimaryPort() ?? configService.get('port');
  const mcpUrl = `http://localhost:${primaryPort}`;
  const theme = getTheme(configService.get('theme'));

  const panel = vscode.window.createWebviewPanel(
    'mcpContinueConfig',
    'MCP Continue 配置',
    vscode.ViewColumn.One,
    { enableScripts: true },
  );

  panel.webview.html = getConfigHtml(mcpUrl, primaryPort, theme);

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.type) {
      case 'copyConfig': {
        const configJson = JSON.stringify({
          mcpServers: {
            mcp_continue: { url: mcpUrl },
          },
        }, null, 2);
        vscode.env.clipboard.writeText(configJson);
        panel.webview.postMessage({ type: 'toast', message: 'MCP 配置已复制到剪贴板' });
        break;
      }
      case 'copyRules': {
        vscode.env.clipboard.writeText(RULE_TEMPLATE);
        panel.webview.postMessage({ type: 'toast', message: '规则模板已复制到剪贴板' });
        break;
      }
      case 'installWindsurf': {
        const home = process.env.HOME || process.env.USERPROFILE || '';
        const configPath = path.join(home, '.codeium', 'windsurf', 'mcp_config.json');
        try {
          writeMCPConfig(configPath, primaryPort);
          panel.webview.postMessage({ type: 'toast', message: `已配置到 Windsurf: ${configPath}` });
        } catch (e) {
          panel.webview.postMessage({ type: 'toast', message: `配置失败: ${e}`, error: true });
        }
        break;
      }
      case 'installCursor': {
        const home = process.env.HOME || process.env.USERPROFILE || '';
        const configPath = path.join(home, '.cursor', 'mcp.json');
        try {
          writeMCPConfig(configPath, primaryPort);
          panel.webview.postMessage({ type: 'toast', message: `已配置到 Cursor: ${configPath}` });
        } catch (e) {
          panel.webview.postMessage({ type: 'toast', message: `配置失败: ${e}`, error: true });
        }
        break;
      }
    }
  }, undefined, context.subscriptions);
}

function writeMCPConfig(configPath: string, port: number): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let config: any = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {}
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  config.mcpServers.mcp_continue = {
    url: `http://localhost:${port}`,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

function getConfigHtml(mcpUrl: string, port: number, theme: any): string {
  const cssVars = `
    --bg-primary: ${theme.colors.bgPrimary};
    --bg-secondary: ${theme.colors.bgSecondary};
    --bg-tertiary: ${theme.colors.bgTertiary};
    --bg-hover: ${theme.colors.bgHover};
    --text-primary: ${theme.colors.textPrimary};
    --text-secondary: ${theme.colors.textSecondary};
    --text-muted: ${theme.colors.textMuted};
    --accent: ${theme.colors.accent};
    --accent-hover: ${theme.colors.accentHover};
    --accent-light: ${theme.colors.accentLight};
    --danger: ${theme.colors.danger};
    --border: ${theme.colors.border};
    --border-light: ${theme.colors.borderLight};
    --shadow: ${theme.colors.shadow};
    --emboss-light: ${theme.colors.embossLight};
    --emboss-dark: ${theme.colors.embossDark};
    --success: ${theme.colors.success};
  `;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    ${getSharedStyles()}
    :root { ${cssVars} }
    body { padding: 30px; overflow-y: auto; height: auto; }
    .container { max-width: 700px; margin: 0 auto; }
    h1 { font-size: 20px; margin-bottom: 6px; }
    .subtitle { color: var(--text-muted); margin-bottom: 24px; font-size: 13px; }
    .card { background: var(--bg-secondary); border-radius: 12px; padding: 20px; margin-bottom: 16px;
      box-shadow: inset 1px 1px 2px var(--emboss-light), inset -1px -1px 2px var(--emboss-dark), 0 4px 16px var(--shadow); }
    .card-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .url-box { font-family: 'Cascadia Code', monospace; font-size: 14px; color: var(--accent);
      padding: 12px 16px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 12px;
      box-shadow: inset 1px 1px 3px var(--emboss-dark), inset -1px -1px 1px var(--emboss-light);
      user-select: all; cursor: pointer; }
    .config-preview { background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px;
      padding: 16px; font-family: monospace; font-size: 12px; white-space: pre; overflow-x: auto;
      color: var(--text-primary); margin-bottom: 12px; }
    .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-row .emboss-btn { flex: none; }
    .toast { position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; border-radius: 8px;
      background: var(--success); color: white; font-size: 13px; opacity: 0; transition: opacity 0.3s; z-index: 9999; }
    .toast.show { opacity: 1; }
    .toast.error { background: var(--danger); }
  </style>
</head>
<body>
  <div class="container">
    <h1>${icon('wrench', 20)} MCP 服务配置</h1>
    <div class="subtitle">将 MCP Continue 配置到你的 AI 工具中</div>

    <div class="card">
      <div class="card-title">${icon('radio', 14)} 服务器地址</div>
      <div class="url-box" onclick="copyUrl()">${mcpUrl}</div>
      <div class="btn-row">
        <button class="emboss-btn emboss-btn-primary" onclick="copyConfig()">${icon('copy', 12)} 复制 MCP 配置</button>
        <button class="emboss-btn emboss-btn-ghost" onclick="copyUrl()">${icon('copy', 12)} 复制 URL</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${icon('settings', 14)} MCP 配置 JSON</div>
      <div class="config-preview">{
  "mcpServers": {
    "mcp_continue": {
      "url": "${mcpUrl}"
    }
  }
}</div>
    </div>

    <div class="card">
      <div class="card-title">${icon('play', 14)} 一键安装</div>
      <div class="btn-row">
        <button class="emboss-btn emboss-btn-primary" onclick="installWindsurf()">Windsurf</button>
        <button class="emboss-btn emboss-btn-primary" onclick="installCursor()">Cursor</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${icon('fileText', 14)} 规则模板</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.6;">
        将规则模板复制到你的 AI 工具的规则文件中（如 .windsurfrules、.cursorrules 等），确保 AI 在每次回复结束时调用 mcp_continue 工具。
      </div>
      <button class="emboss-btn emboss-btn-ghost" onclick="copyRules()">${icon('copy', 12)} 复制规则模板</button>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const vscode = acquireVsCodeApi();
    function copyConfig() { vscode.postMessage({ type: 'copyConfig' }); }
    function copyUrl() { vscode.postMessage({ type: 'copyConfig' }); }
    function copyRules() { vscode.postMessage({ type: 'copyRules' }); }
    function installWindsurf() { vscode.postMessage({ type: 'installWindsurf' }); }
    function installCursor() { vscode.postMessage({ type: 'installCursor' }); }
    function showToast(msg, err) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.className = 'toast show' + (err ? ' error' : '');
      setTimeout(() => t.className = 'toast', 3000);
    }
    window.addEventListener('message', function(e) {
      if (e.data.type === 'toast') showToast(e.data.message, e.data.error);
    });
  </script>
</body>
</html>`;
}
