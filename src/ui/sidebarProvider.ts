import * as vscode from 'vscode';
import { ConfigService } from '../services/configService';
import { StatsService } from '../services/statsService';
import { PortService } from '../services/portService';
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
      }
    });
  }

  updateContent(): void {
    if (!this.view) return;

    const mcpServer = this.getMCPServer();
    const theme = getTheme(this.configService.get('theme'));

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
    );
  }

  updateServerStatus(running: boolean, port: number): void {
    this.view?.webview.postMessage({ type: 'serverStatus', running, port });
  }

  refreshView(): void {
    this.updateContent();
  }
}
