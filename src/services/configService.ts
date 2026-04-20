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
};

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
