import * as vscode from 'vscode';
import { ConfigService, HeartbeatMode } from '../services/configService';
import { StatsService } from '../services/statsService';
import { PortService } from '../services/portService';
import { AutoTaskService } from '../services/autoTaskService';
import { MCPServer } from '../server/mcpServer';
import { getTheme } from '../assets/themes';
import { getSidebarHtml } from '../html/sidebar';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  constructor(
    private extensionUri: vscode.Uri,
    private configService: ConfigService,
    private statsService: StatsService,
    private portService: PortService,
    private getMCPServer: () => MCPServer | null,
    private autoTaskService: AutoTaskService,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    this.updateContent();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      const mcpServer = this.getMCPServer();
      switch (message.type) {
        case 'toggleServer':
          if (mcpServer?.isRunning()) {
            mcpServer.stop();
          } else {
            await mcpServer?.start();
          }
          this.updateContent();
          break;

        case 'refreshPort':
          if (mcpServer?.isRunning()) {
            mcpServer.stop();
          }
          await mcpServer?.start();
          this.updateContent();
          break;

        case 'setTheme':
          await this.configService.update('theme', message.theme);
          this.updateContent();
          break;

        case 'saveSettings':
          if (message.autoStart !== undefined) {
            await this.configService.update('autoStart', message.autoStart);
          }
          if (message.showStats !== undefined) {
            await this.configService.update('showStats', message.showStats);
          }
          if (message.allowImageUpload !== undefined) {
            await this.configService.update('allowImageUpload', message.allowImageUpload);
          }
          if (message.allowFileReference !== undefined) {
            await this.configService.update('allowFileReference', message.allowFileReference);
          }
          if (message.timeout !== undefined) {
            await this.configService.update('timeout', message.timeout);
          }
          if (message.heartbeatMode !== undefined) {
            await this.configService.update('heartbeatMode', message.heartbeatMode);
          }
          this.updateContent();
          this.view?.webview.postMessage({ type: 'toast', message: '设置已保存' });
          break;

        case 'resetStats':
          this.statsService.reset();
          this.updateContent();
          break;

        case 'installMCP':
          vscode.commands.executeCommand('mcpContinue.installMCP');
          break;

        case 'testDialog':
          vscode.commands.executeCommand('mcpContinue.show');
          break;

        case 'copyRules':
          vscode.commands.executeCommand('mcpContinue.copyRules');
          break;

        case 'copyText':
          vscode.env.clipboard.writeText(message.text);
          break;

        case 'refreshRegistration':
          if (mcpServer && mcpServer.isRunning() && !mcpServer.isPrimaryServer()) {
            const success = await mcpServer.manualRegister();
            if (success) {
              this.updateContent();
              this.view?.webview.postMessage({ type: 'toast', message: '注册成功' });
            } else {
              this.view?.webview.postMessage({ type: 'toast', message: '注册失败，请检查主服务器是否运行' });
            }
          }
          break;

        case 'removeNode':
          if (mcpServer && mcpServer.isPrimaryServer() && message.port) {
            mcpServer.removeRegisteredPort(message.port);
            this.updateContent();
          }
          break;

        case 'refreshHealthCheck':
          if (mcpServer && mcpServer.isPrimaryServer()) {
            await mcpServer.runHealthCheck();
            this.updateContent();
            this.view?.webview.postMessage({ type: 'toast', message: '状态已刷新' });
          }
          break;

        case 'autoTaskSaveSettings': {
          const updates: [string, unknown][] = [
            ['autoTaskEnabled', message.enabled],
            ['autoTaskAgentName', message.agentName],
            ['autoTaskAgentId', message.agentId],
            ['autoTaskModelName', message.modelName],
            ['autoTaskIntervalMin', message.intervalMin],
            ['autoTaskPrompt', message.prompt],
          ];
          for (const [key, val] of updates) {
            if (val !== undefined && val !== null) {
              await this.configService.update(key as any, val);
            }
          }

          if (message.enabled) {
            this.autoTaskService.start((remaining) => {
              this.view?.webview.postMessage({ type: 'autoTaskCountdown', remaining });
            });
          } else {
            this.autoTaskService.stop();
            this.view?.webview.postMessage({ type: 'autoTaskCountdown', remaining: '' });
          }

          this.updateContent();
          this.view?.webview.postMessage({ type: 'toast', message: '设置已保存' });
          break;
        }
      }
    });
  }

  updateContent(): void {
    if (!this.view) return;

    const mcpServer = this.getMCPServer();
    const theme = getTheme(this.configService.get('theme'));
    const taskState = this.autoTaskService.getState();

    this.view.webview.html = getSidebarHtml(
      mcpServer?.isRunning() ?? false,
      this.portService.getCurrentPort(),
      this.statsService.getSnapshot(),
      theme,
      this.configService.get('autoStart'),
      this.configService.get('showStats'),
      this.configService.get('allowImageUpload'),
      this.configService.get('allowFileReference'),
      mcpServer?.isPrimaryServer() ?? true,
      mcpServer?.getPrimaryPort() ?? 52686,
      this.configService.get('timeout'),
      this.configService.get('heartbeatMode'),
      this.configService.get('autoTaskEnabled'),
      this.configService.get('autoTaskAgentName'),
      this.configService.get('autoTaskAgentId'),
      this.configService.get('autoTaskModelName'),
      this.configService.get('autoTaskIntervalMin'),
      this.configService.get('autoTaskPrompt'),
      taskState.running,
      taskState.remaining,
      Array.from(mcpServer?.getRegisteredPorts() ?? []),
      mcpServer?.isRegisteredWithPrimary() ?? false,
    );
  }

  updateServerStatus(running: boolean, port: number): void {
    this.view?.webview.postMessage({ type: 'serverStatus', running, port });
  }

  refreshView(): void {
    this.updateContent();
  }

  updateAutoTaskCountdown(remaining: string): void {
    this.view?.webview.postMessage({ type: 'autoTaskCountdown', remaining });
  }
}
