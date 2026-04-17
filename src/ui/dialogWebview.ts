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
}

interface QueuedRequest {
  requestId: string;
  reason: string;
  resolve: (result: any) => void;
}

let pendingRequests = new Map<string, PendingRequest>();
let requestQueue: QueuedRequest[] = [];
let isProcessingRequest = false;
let requestCounter = 0;
let currentContext: vscode.ExtensionContext | null = null;
let currentConfigService: ConfigService | null = null;
let currentStatsService: StatsService | null = null;
let currentPortService: PortService | null = null;

export function showAskContinueAndWait(
  context: vscode.ExtensionContext,
  reason: string,
  configService: ConfigService,
  statsService: StatsService,
  portService: PortService,
): Promise<any> {
  return new Promise((resolve) => {
    const requestId = `req_${Date.now()}_${++requestCounter}`;

    currentContext = context;
    currentConfigService = configService;
    currentStatsService = statsService;
    currentPortService = portService;

    requestQueue.push({ requestId, reason: reason || 'Task completed', resolve });

    if (!isProcessingRequest) {
      processNextRequest();
    }
  });
}

export function showManualDialog(
  context: vscode.ExtensionContext,
  configService: ConfigService,
  statsService: StatsService,
  portService: PortService,
): void {
  const requestId = `manual_${Date.now()}_${++requestCounter}`;
  createDialogWebview(
    context, requestId,
    configService.get('defaultReason'),
    (result) => {
      vscode.window.showInformationMessage(result.shouldContinue ? '继续执行' : '对话已结束');
    },
    configService, statsService, portService,
  );
}

function processNextRequest(): void {
  if (requestQueue.length === 0) {
    isProcessingRequest = false;
    return;
  }

  isProcessingRequest = true;
  const { requestId, reason, resolve } = requestQueue.shift()!;

  if (!currentContext || !currentConfigService || !currentStatsService || !currentPortService) {
    resolve({ shouldContinue: false });
    isProcessingRequest = false;
    return;
  }

  createDialogWebview(
    currentContext,
    requestId,
    reason,
    (result) => {
      resolve(result);
      processNextRequest();
    },
    currentConfigService,
    currentStatsService,
    currentPortService,
  );
}

function createDialogWebview(
  context: vscode.ExtensionContext,
  requestId: string,
  reason: string,
  resolve: (result: any) => void,
  configService: ConfigService,
  statsService: StatsService,
  portService: PortService,
): void {
  const theme = getTheme(configService.get('theme'));
  const stats = statsService.getSnapshot();
  const myPort = portService.getCurrentPort();

  const panel = vscode.window.createWebviewPanel(
    `mcpContinue_${requestId}`,
    `MCP Continue :${myPort}`,
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  pendingRequests.set(requestId, { resolve, panel, reason });

  panel.webview.html = getDialogHtml(
    reason,
    stats,
    theme,
    configService.get('showStats'),
    configService.get('allowImageUpload'),
    configService.get('allowFileReference'),
  );

  panel.webview.onDidReceiveMessage((message) => {
    switch (message.type) {
      case 'continue': {
        const instruction = message.instruction || '';
        handleResult(requestId, {
          shouldContinue: true,
          userInstruction: instruction,
          imageContents: message.imageContents,
        }, statsService, portService);
        break;
      }
      case 'end':
        handleResult(requestId, { shouldContinue: false }, statsService, portService);
        break;
      case 'selectImages':
        selectImagesForRequest(requestId);
        break;
      case 'toggleTheme':
        configService.update('theme', message.theme === 'dark' ? 'dark' : 'light');
        break;
    }
  }, undefined, context.subscriptions);

  panel.onDidDispose(() => {
    const request = pendingRequests.get(requestId);
    if (request) {
      request.resolve({ shouldContinue: false });
      pendingRequests.delete(requestId);
    }
  });
}

function handleResult(
  requestId: string,
  result: any,
  statsService: StatsService,
  portService: PortService,
): void {
  const request = pendingRequests.get(requestId);
  if (!request) return;

  pendingRequests.delete(requestId);
  statsService.record(
    result.shouldContinue ? 'continue' : 'end',
    request.reason,
    result.userInstruction || '',
    portService.getWorkspaceId(),
  );

  if (request.panel) {
    request.panel.dispose();
  }

  request.resolve(result);

  vscode.window.showInformationMessage(
    result.shouldContinue
      ? `继续执行${result.userInstruction ? '，指令: ' + result.userInstruction : ''}`
      : '对话已结束',
  );
}

async function selectImagesForRequest(requestId: string): Promise<void> {
  const request = pendingRequests.get(requestId);
  if (!request) return;

  const uris = await vscode.window.showOpenDialog({
    canSelectMany: true,
    filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] },
  });

  if (uris && request.panel) {
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

    request.panel.webview.postMessage({ type: 'imagesSelected', contents });
  }
}
