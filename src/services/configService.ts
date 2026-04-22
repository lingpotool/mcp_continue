import * as vscode from 'vscode';

export type HeartbeatMode = 'persona' | 'file-op'

export interface MCPConfig {
  autoStart: boolean;
  port: number;
  theme: 'dark' | 'light';
  showStats: boolean;
  allowImageUpload: boolean;
  allowFileReference: boolean;
  defaultReason: string;
  timeout: number;
  heartbeatMode: HeartbeatMode;
  autoTaskEnabled: boolean;
  autoTaskAgentName: string;
  autoTaskAgentId: string;
  autoTaskModelName: string;
  autoTaskIntervalMin: number;
  autoTaskPrompt: string;
}

const DEFAULT_CONFIG: MCPConfig = {
  autoStart: true,
  port: 52686,
  theme: 'dark',
  showStats: true,
  allowImageUpload: true,
  allowFileReference: true,
  defaultReason: 'Task completed',
  timeout: 600,
  heartbeatMode: 'persona',
  autoTaskEnabled: false,
  autoTaskAgentName: 'SOLO Coder',
  autoTaskAgentId: 'solo_coder',
  autoTaskModelName: '',
  autoTaskIntervalMin: 30,
  autoTaskPrompt: '',
};

export function getRulesTemplate(port: number): string {
  return `# MCP Continue - AI对话持续规则

⚠️ 最高优先级：每次回复结束前必须调用 mcp_continue 工具！

## 核心规则

1. **完整输出** - 输出完整代码和答案，禁止省略
2. **持续执行** - 复杂任务尽量一次完成
3. **结束确认** - 想结束对话时，必须先调用 mcp_continue 工具
4. **遵守选择** - 用户选择"结束"时，必须立即停止

## 强制指令：调用 mcp_continue 工具

你必须在每次回复结束时调用 mcp_continue 工具，传递以下参数：

\`\`\`json
{
  "reason": "任务完成原因",
  "port": ${port}
}
\`\`\`

- **reason**: 你想要结束对话的原因
- **port**: 当前窗口端口号（${port}），这是强制参数，不可省略
`;
}

export class ConfigService {
  private config: MCPConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.load();
  }

  private load(): void {
    const vsConfig = require('vscode').workspace.getConfiguration('mcpContinue');
    this.config = {
      autoStart: vsConfig.get('autoStart', DEFAULT_CONFIG.autoStart),
      port: vsConfig.get('port', DEFAULT_CONFIG.port),
      theme: vsConfig.get('theme', DEFAULT_CONFIG.theme),
      showStats: vsConfig.get('showStats', DEFAULT_CONFIG.showStats),
      allowImageUpload: vsConfig.get('allowImageUpload', DEFAULT_CONFIG.allowImageUpload),
      allowFileReference: vsConfig.get('allowFileReference', DEFAULT_CONFIG.allowFileReference),
      defaultReason: vsConfig.get('defaultReason', DEFAULT_CONFIG.defaultReason),
      timeout: vsConfig.get('timeout', DEFAULT_CONFIG.timeout),
      heartbeatMode: vsConfig.get('heartbeatMode', DEFAULT_CONFIG.heartbeatMode),
      autoTaskEnabled: vsConfig.get('autoTaskEnabled', DEFAULT_CONFIG.autoTaskEnabled),
      autoTaskAgentName: vsConfig.get('autoTaskAgentName', DEFAULT_CONFIG.autoTaskAgentName),
      autoTaskAgentId: vsConfig.get('autoTaskAgentId', DEFAULT_CONFIG.autoTaskAgentId),
      autoTaskModelName: vsConfig.get('autoTaskModelName', DEFAULT_CONFIG.autoTaskModelName),
      autoTaskIntervalMin: vsConfig.get('autoTaskIntervalMin', DEFAULT_CONFIG.autoTaskIntervalMin),
      autoTaskPrompt: vsConfig.get('autoTaskPrompt', DEFAULT_CONFIG.autoTaskPrompt),
    };
  }

  reload(): void {
    this.load();
  }

  get<K extends keyof MCPConfig>(key: K): MCPConfig[K] {
    return this.config[key];
  }

  async update<K extends keyof MCPConfig>(key: K, value: MCPConfig[K]): Promise<void> {
    const vscode = require('vscode');
    const vsConfig = vscode.workspace.getConfiguration('mcpContinue');
    await vsConfig.update(key, value, vscode.ConfigurationTarget.Global);
    this.config[key] = value;
  }

  getAll(): MCPConfig {
    return { ...this.config };
  }
}
