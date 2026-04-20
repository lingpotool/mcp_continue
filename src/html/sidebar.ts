import { StatsSnapshot } from '../services/statsService';
import { HeartbeatMode } from '../services/configService';
import { Theme, generateCSSVariables } from '../assets/themes';
import { icon } from '../assets/icons';
import { getSharedStyles } from '../assets/styles';

export function getSidebarHtml(
  serverRunning: boolean,
  port: number,
  stats: StatsSnapshot,
  theme: Theme,
  autoStart: boolean,
  showStats: boolean,
  allowImageUpload: boolean,
  allowFileReference: boolean,
  isPrimary: boolean,
  primaryPort: number,
  timeout: number,
  heartbeatMode: HeartbeatMode,
): string {
  const cssVars = generateCSSVariables(theme);
  const sharedCSS = getSharedStyles();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${sharedCSS}
    :root { ${cssVars} }

    html { height: auto; overflow-y: auto; }

    body {
      padding: 12px;
      overflow-y: auto;
      height: auto;
    }

    .section {
      margin-bottom: 14px;
    }

    .server-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--bg-tertiary);
      border-radius: 10px;
      margin-bottom: 10px;
      box-shadow:
        inset 1px 1px 2px var(--emboss-dark),
        inset -1px -1px 1px var(--emboss-light);
    }

    .server-status-text {
      flex: 1;
      font-size: 12px;
      font-weight: 600;
    }

    .port-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: var(--accent);
      color: white;
      border-radius: 8px;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 8px;
      user-select: all;
      cursor: pointer;
      box-shadow: 0 2px 6px var(--shadow);
    }

    .port-badge:hover {
      opacity: 0.9;
    }

    .port-label {
      font-size: 10px;
      font-weight: 500;
      opacity: 0.85;
    }

    .server-url {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 11px;
      color: var(--accent);
      padding: 6px 10px;
      background: var(--bg-tertiary);
      border-radius: 6px;
      margin-bottom: 10px;
      box-shadow:
        inset 1px 1px 2px var(--emboss-dark),
        inset -1px -1px 1px var(--emboss-light);
      user-select: all;
      cursor: pointer;
    }

    .prompt-box {
      padding: 10px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--accent);
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow:
        inset 1px 1px 2px var(--emboss-dark),
        inset -1px -1px 1px var(--emboss-light);
    }

    .prompt-box .prompt-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .prompt-box .prompt-text {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 10px;
      color: var(--text-primary);
      white-space: pre-wrap;
      line-height: 1.5;
      padding: 6px 8px;
      background: var(--bg-primary);
      border-radius: 4px;
    }

    .config-preview {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 10px;
      color: var(--text-primary);
      padding: 8px 10px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 8px;
      white-space: pre;
      overflow-x: auto;
      box-shadow:
        inset 1px 1px 2px var(--emboss-dark),
        inset -1px -1px 1px var(--emboss-light);
    }

    .btn-row {
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
    }

    .btn-row .emboss-btn {
      flex: 1;
      padding: 7px 10px;
      font-size: 11px;
    }

    .form-group {
      margin-bottom: 10px;
    }

    .form-group label {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .port-row {
      display: flex;
      gap: 6px;
    }

    .port-row input {
      flex: 1;
    }

    .port-row button {
      flex-shrink: 0;
      padding: 7px 10px;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
    }

    .checkbox-group input[type="checkbox"] {
      accent-color: var(--accent);
      width: 14px;
      height: 14px;
    }

    .checkbox-group label {
      font-size: 12px;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .theme-switch {
      display: flex;
      gap: 4px;
      padding: 3px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      box-shadow:
        inset 1px 1px 2px var(--emboss-dark),
        inset -1px -1px 1px var(--emboss-light);
    }

    .theme-option {
      flex: 1;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      background: transparent;
      color: var(--text-muted);
      font-family: inherit;
    }

    .theme-option.active {
      background: var(--accent);
      color: white;
      box-shadow: 0 2px 4px var(--shadow);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin-bottom: 8px;
    }

    .stat-card {
      text-align: center;
      padding: 8px 4px;
      background: var(--bg-tertiary);
      border-radius: 8px;
      box-shadow:
        inset 1px 1px 2px var(--emboss-dark),
        inset -1px -1px 1px var(--emboss-light);
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .stat-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .stat-detail {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-secondary);
      padding: 4px 0;
    }

    .action-btn {
      width: 100%;
      padding: 8px 12px;
      margin-bottom: 6px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .reset-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 10px;
      cursor: pointer;
      padding: 4px 8px;
      font-family: inherit;
    }
    .reset-btn:hover { color: var(--danger); }
  </style>
</head>
<body>
  <div class="section">
    <div class="section-title">${icon('radio', 12)} 服务器状态</div>
    <div class="server-status">
      <span class="status-dot ${serverRunning ? 'running' : 'stopped'}"></span>
      <span class="server-status-text" id="statusText">${serverRunning ? (isPrimary ? '主服务器运行中' : '从服务器运行中') : '已停止'}</span>
    </div>
    ${serverRunning ? `
    <div class="port-badge" onclick="copyPort()" title="点击复制端口号">
      <span class="port-label">PORT</span>
      <span id="portDisplay">${port}</span>
    </div>
    ${!isPrimary ? `<div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;">主服务器端口: ${primaryPort}</div>` : ''}
    ` : ''}
    <div class="server-url" id="serverUrl" onclick="copyUrl()">http://localhost:${primaryPort}</div>
    <div class="btn-row">
      <button class="emboss-btn ${serverRunning ? 'emboss-btn-danger' : 'emboss-btn-primary'}" onclick="toggleServer()">
        ${serverRunning ? icon('square', 12) + ' 停止' : icon('play', 12) + ' 启动'}
      </button>
      <button class="emboss-btn emboss-btn-ghost" onclick="refreshPort()">
        ${icon('refresh', 12)}
      </button>
    </div>
  </div>

  ${serverRunning ? `
  <div class="divider"></div>

  <div class="section">
    <div class="section-title">${icon('messageSquare', 12)} 对话提示词</div>
    <div class="prompt-box">
      <div class="prompt-title">${icon('copy', 10)} 复制以下提示词到 AI 对话中</div>
      <div class="prompt-text" id="promptText">调用 mcp_continue 工具，传递 port=${port} 参数。</div>
    </div>
    <div class="btn-row">
      <button class="emboss-btn emboss-btn-primary" onclick="copyPrompt()" style="flex:1;padding:7px 10px;font-size:11px">
        ${icon('copy', 12)} 复制提示词
      </button>
    </div>
  </div>
  ` : ''}

  <div class="divider"></div>

  <div class="section">
    <div class="section-title">${icon('settings', 12)} MCP 配置</div>
    <div class="config-preview" id="configPreview">{
  "mcpServers": {
    "mcp_continue": {
      "url": "http://localhost:${primaryPort}"
    }
  }
}</div>
    <div class="btn-row">
      <button class="emboss-btn emboss-btn-ghost" onclick="copyConfig()" style="flex:1;padding:7px 10px;font-size:11px">
        ${icon('copy', 12)} 复制配置
      </button>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="section-title">${icon('settings', 12)} 设置</div>
    <div class="checkbox-group">
      <input type="checkbox" id="autoStart" ${autoStart ? 'checked' : ''}>
      <label for="autoStart">自动启动</label>
    </div>
    <div class="form-group" style="margin-top:8px">
      <label>主题</label>
      <div class="theme-switch">
        <button class="theme-option ${theme.name === 'dark' ? 'active' : ''}" onclick="setTheme('dark')">
          ${icon('moon', 12)} 深色
        </button>
        <button class="theme-option ${theme.name === 'light' ? 'active' : ''}" onclick="setTheme('light')">
          ${icon('sun', 12)} 浅色
        </button>
      </div>
    </div>
    <div class="checkbox-group">
      <input type="checkbox" id="showStats" ${showStats ? 'checked' : ''}>
      <label for="showStats">对话框显示统计</label>
    </div>
    <div class="checkbox-group">
      <input type="checkbox" id="allowImageUpload" ${allowImageUpload ? 'checked' : ''}>
      <label for="allowImageUpload">图片上传</label>
    </div>
    <div class="checkbox-group">
      <input type="checkbox" id="allowFileReference" ${allowFileReference ? 'checked' : ''}>
      <label for="allowFileReference">文件引用 (@)</label>
    </div>
    <div class="form-group" style="margin-top:8px">
      <label>响应超时（秒，0=永不超时）</label>
      <input type="number" class="emboss-input" id="timeout" value="${timeout}" min="0" max="3600" step="30" style="width:100%">
    </div>
    <div class="form-group" style="margin-top:8px">
      <label>超时心跳策略</label>
      <select class="emboss-input" id="heartbeatMode" style="width:100%;padding:7px 10px;font-size:12px;">
        <option value="persona" ${heartbeatMode === 'persona' ? 'selected' : ''}>角色演化 — AI修改角色档案</option>
        <option value="file-op" ${heartbeatMode === 'file-op' ? 'selected' : ''}>文件操作 — AI创建并删除临时文件</option>
      </select>
    </div>
    <button class="emboss-btn emboss-btn-primary action-btn" onclick="saveSettings()" style="margin-top:8px">
      ${icon('check', 12)} 保存设置
    </button>
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="section-title">${icon('barChart', 12)} 统计</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalCalls}</div>
        <div class="stat-label">总计</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--success)">${stats.continueCount}</div>
        <div class="stat-label">继续</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--danger)">${stats.endCount}</div>
        <div class="stat-label">结束</div>
      </div>
    </div>
    <div class="stat-detail">${icon('clock', 12)} 运行 ${stats.sessionUptime}</div>
    <div class="stat-detail">${icon('activity', 12)} 最近: ${stats.lastCallTime}</div>
    <button class="reset-btn" onclick="resetStats()">${icon('trash', 10)} 重置统计</button>
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="section-title">${icon('wrench', 12)} 工具</div>
    <button class="emboss-btn emboss-btn-ghost action-btn" onclick="installMCP()">
      ${icon('wrench', 12)} 配置 MCP
    </button>
    <button class="emboss-btn emboss-btn-ghost action-btn" onclick="testDialog()">
      ${icon('flask', 12)} 测试对话框
    </button>
    <button class="emboss-btn emboss-btn-ghost action-btn" onclick="copyRules()">
      ${icon('copy', 12)} 复制规则模板
    </button>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const vscode = acquireVsCodeApi();
    const currentPort = ${port};

    function toggleServer() {
      vscode.postMessage({ type: 'toggleServer' });
    }

    function refreshPort() {
      vscode.postMessage({ type: 'refreshPort' });
    }

    function setTheme(theme) {
      vscode.postMessage({ type: 'setTheme', theme });
    }

    function saveSettings() {
      const timeoutVal = parseInt(document.getElementById('timeout').value, 10);
      vscode.postMessage({
        type: 'saveSettings',
        autoStart: document.getElementById('autoStart').checked,
        showStats: document.getElementById('showStats').checked,
        allowImageUpload: document.getElementById('allowImageUpload').checked,
        allowFileReference: document.getElementById('allowFileReference').checked,
        timeout: isNaN(timeoutVal) ? 600 : Math.max(0, Math.min(3600, timeoutVal)),
        heartbeatMode: document.getElementById('heartbeatMode').value,
      });
    }

    function resetStats() {
      vscode.postMessage({ type: 'resetStats' });
    }

    function installMCP() {
      vscode.postMessage({ type: 'installMCP' });
    }

    function testDialog() {
      vscode.postMessage({ type: 'testDialog' });
    }

    function copyRules() {
      vscode.postMessage({ type: 'copyRules' });
    }

    function copyPort() {
      vscode.postMessage({ type: 'copyText', text: String(currentPort) });
      showToast('端口号已复制: ' + currentPort);
    }

    function copyPrompt() {
      const prompt = '调用 mcp_continue 工具，传递 port=' + currentPort + ' 参数。';
      vscode.postMessage({ type: 'copyText', text: prompt });
      showToast('提示词已复制');
    }

    function copyConfig() {
      const primaryPort = ${primaryPort};
      const config = JSON.stringify({
        mcpServers: {
          mcp_continue: {
            url: 'http://localhost:' + primaryPort
          }
        }
      }, null, 2);
      vscode.postMessage({ type: 'copyText', text: config });
      showToast('MCP 配置已复制');
    }

    function copyUrl() {
      const url = document.getElementById('serverUrl').textContent;
      vscode.postMessage({ type: 'copyText', text: url });
      showToast('已复制 URL');
    }

    function showToast(msg, isError) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show' + (isError ? ' error' : '');
      setTimeout(() => t.className = 'toast', 2000);
    }

    window.addEventListener('message', function(e) {
      const msg = e.data;
      if (msg.type === 'serverStatus') {
        document.getElementById('statusText').textContent = msg.running ? '运行中' : '已停止';
        const dot = document.querySelector('.status-dot');
        dot.className = 'status-dot ' + (msg.running ? 'running' : 'stopped');
        if (msg.port) {
          document.getElementById('portDisplay') && (document.getElementById('portDisplay').textContent = msg.port);
        }
      }
      if (msg.type === 'toast') {
        showToast(msg.message, msg.error);
      }
      if (msg.type === 'statsUpdate') {
        location.reload();
      }
    });
  </script>
</body>
</html>`;
}
