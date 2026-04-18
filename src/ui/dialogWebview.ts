import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '../services/configService';
import { StatsService } from '../services/statsService';
import { PortService } from '../services/portService';
import { getTheme } from '../assets/themes';
import { getDialogHtml } from '../html/dialog';

interface PendingRequest {
  resolve: (result: any) => void;
  panel: vscode.WebviewPanel;
  reason: string;
  requestId: string;
}

export class DialogManager {
  private pendingRequest: PendingRequest | null = null;
  private manualPanel: vscode.WebviewPanel | null = null;
  private requestCounter = 0;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private port: number,
    private context: vscode.ExtensionContext,
    private configService: ConfigService,
    private statsService: StatsService,
    private portService: PortService,
  ) {}

  getPort(): number { return this.port; }

  showAskContinueAndWait(reason: string): Promise<any> {
    return new Promise((resolve) => {
      this.clearTimeout();
      this.resolvePending({ shouldContinue: false });

      const requestId = `req_${this.port}_${Date.now()}_${++this.requestCounter}`;
      this.createDialogWebview(requestId, reason || 'Task completed', resolve);

      const timeoutSeconds = this.configService.get('timeout');
      if (timeoutSeconds > 0) {
        this.timeoutHandle = setTimeout(() => {
          this.timeoutHandle = null;
          this.resolvePending({ isTimeout: true });
        }, timeoutSeconds * 1000);
      }
    });
  }

  showManualDialog(): void {
    if (this.manualPanel) {
      this.manualPanel.dispose();
      this.manualPanel = null;
    }

    const requestId = `manual_${this.port}_${Date.now()}_${++this.requestCounter}`;
    const theme = getTheme(this.configService.get('theme'));
    const stats = this.statsService.getSnapshot();
    const myPort = this.portService.getCurrentPort();
    const reason = this.configService.get('defaultReason');

    const panel = vscode.window.createWebviewPanel(
      `mcpContinue_manual_${this.port}_${requestId}`,
      `MCP Continue :${myPort}`,
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    this.manualPanel = panel;

    panel.webview.html = getDialogHtml(
      reason, stats, theme,
      this.configService.get('showStats'),
      this.configService.get('allowImageUpload'),
      this.configService.get('allowFileReference'),
    );

    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'continue': {
          const instruction = message.instruction || '';
          this.statsService.record(
            'continue', reason, instruction, this.portService.getWorkspaceId(),
          );
          vscode.window.showInformationMessage(`继续执行${instruction ? '，指令: ' + instruction : ''}`);
          this.manualPanel = null;
          panel.dispose();
          break;
        }
        case 'end':
          this.statsService.record('end', reason, '', this.portService.getWorkspaceId());
          vscode.window.showInformationMessage('对话已结束');
          this.manualPanel = null;
          panel.dispose();
          break;
        case 'selectImages':
          this.selectImagesForPanel(panel);
          break;
        case 'toggleTheme':
          this.configService.update('theme', message.theme === 'dark' ? 'dark' : 'light');
          break;
      }
    }, undefined, this.context.subscriptions);

    panel.onDidDispose(() => {
      if (this.manualPanel === panel) {
        this.manualPanel = null;
      }
    });
  }

  private createDialogWebview(
    requestId: string,
    reason: string,
    resolve: (result: any) => void,
  ): void {
    const theme = getTheme(this.configService.get('theme'));
    const stats = this.statsService.getSnapshot();
    const myPort = this.portService.getCurrentPort();

    const panel = vscode.window.createWebviewPanel(
      `mcpContinue_${this.port}_${requestId}`,
      `MCP Continue :${myPort}`,
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    this.pendingRequest = { resolve, panel, reason, requestId };

    panel.webview.html = getDialogHtml(
      reason, stats, theme,
      this.configService.get('showStats'),
      this.configService.get('allowImageUpload'),
      this.configService.get('allowFileReference'),
    );

    panel.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'continue': {
          this.handleResult(requestId, {
            shouldContinue: true,
            userInstruction: message.instruction || '',
            imageContents: message.imageContents,
          });
          break;
        }
        case 'end':
          this.handleResult(requestId, { shouldContinue: false });
          break;
        case 'selectImages':
          if (this.pendingRequest) {
            this.selectImagesForPanel(this.pendingRequest.panel);
          }
          break;
        case 'toggleTheme':
          this.configService.update('theme', message.theme === 'dark' ? 'dark' : 'light');
          break;
      }
    }, undefined, this.context.subscriptions);

    panel.onDidDispose(() => {
      this.resolvePending({ shouldContinue: false });
    });
  }

  private handleResult(requestId: string, result: any): void {
    if (!this.pendingRequest || this.pendingRequest.requestId !== requestId) return;

    this.clearTimeout();

    const { reason, resolve, panel } = this.pendingRequest;
    this.pendingRequest = null;

    this.statsService.record(
      result.shouldContinue ? 'continue' : 'end',
      reason,
      result.userInstruction || '',
      this.portService.getWorkspaceId(),
    );

    panel.dispose();
    resolve(result);

    vscode.window.showInformationMessage(
      result.shouldContinue
        ? `继续执行${result.userInstruction ? '，指令: ' + result.userInstruction : ''}`
        : '对话已结束',
    );
  }

  private resolvePending(result: any): void {
    if (!this.pendingRequest) return;
    this.clearTimeout();
    const { resolve, panel } = this.pendingRequest;
    this.pendingRequest = null;
    panel.dispose();
    resolve(result);
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private async selectImagesForPanel(panel: vscode.WebviewPanel): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] },
    });

    if (uris) {
      const contents: Array<{ name: string; data: string; mimeType: string }> = [];
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
      };

      for (const uri of uris) {
        try {
          const data = fs.readFileSync(uri.fsPath);
          const ext = path.extname(uri.fsPath).toLowerCase();
          contents.push({
            name: path.basename(uri.fsPath),
            data: data.toString('base64'),
            mimeType: mimeTypes[ext] || 'image/png',
          });
        } catch {}
      }

      panel.webview.postMessage({ type: 'imagesSelected', contents });
    }
  }

  dispose(): void {
    this.clearTimeout();
    this.resolvePending({ shouldContinue: false });
    if (this.manualPanel) {
      this.manualPanel.dispose();
      this.manualPanel = null;
    }
  }
}
