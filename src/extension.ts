import * as vscode from 'vscode';
import { ConfigService } from './services/configService';
import { StatsService } from './services/statsService';
import { PortService } from './services/portService';
import { MCPServer } from './server/mcpServer';
import { SidebarProvider } from './ui/sidebarProvider';
import { showAskContinueAndWait, showManualDialog } from './ui/dialogWebview';
import { showMCPConfigPanel } from './ui/configPanel';

let configService: ConfigService;
let statsService: StatsService;
let portService: PortService;
let mcpServer: MCPServer | null = null;
let sidebarProvider: SidebarProvider;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  configService = new ConfigService();
  statsService = new StatsService(context);
  portService = new PortService(configService);
  outputChannel = vscode.window.createOutputChannel('MCP Continue');

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'mcpContinue.openDashboard';
  updateStatusBar();
  statusBarItem.show();

  sidebarProvider = new SidebarProvider(
    context.extensionUri,
    configService,
    statsService,
    portService,
    () => mcpServer,
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mcpContinue.sidebarView', sidebarProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mcpContinue.openDashboard', () => {
      showMCPConfigPanel(context, configService, portService, () => mcpServer);
    }),
    vscode.commands.registerCommand('mcpContinue.show', () => {
      showManualDialog(context, configService, statsService, portService);
    }),
    vscode.commands.registerCommand('mcpContinue.startServer', async () => {
      await ensureServer(context);
      updateStatusBar();
      sidebarProvider.updateContent();
    }),
    vscode.commands.registerCommand('mcpContinue.stopServer', () => {
      mcpServer?.stop();
      updateStatusBar();
      sidebarProvider.updateContent();
    }),
    vscode.commands.registerCommand('mcpContinue.toggleServer', async () => {
      if (mcpServer?.isRunning()) {
        mcpServer.stop();
      } else {
        await ensureServer(context);
      }
      updateStatusBar();
      sidebarProvider.updateContent();
    }),
    vscode.commands.registerCommand('mcpContinue.installMCP', () => {
      showMCPConfigPanel(context, configService, portService, () => mcpServer);
    }),
    vscode.commands.registerCommand('mcpContinue.resetStats', () => {
      statsService.reset();
      sidebarProvider.refreshView();
      vscode.window.showInformationMessage('统计已重置');
    }),
    vscode.commands.registerCommand('mcpContinue.copyRules', () => {
      const port = portService.getCurrentPort();
      const rules = `# MCP Continue - AI对话持续规则

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
      vscode.env.clipboard.writeText(rules);
      vscode.window.showInformationMessage('规则模板已复制到剪贴板');
    }),
    statusBarItem,
    outputChannel,
  );

  if (configService.get('autoStart') !== false) {
    ensureServer(context);
  }
}

async function ensureServer(context: vscode.ExtensionContext): Promise<void> {
  if (mcpServer?.isRunning()) return;

  mcpServer = new MCPServer(
    configService,
    statsService,
    portService,
    outputChannel,
    async (request: any) => {
      const myPort = portService.getCurrentPort();
      const reason = request._reason || request.params?.arguments?.reason || 'Task completed';

      const result = await showAskContinueAndWait(context, reason, configService, statsService, portService);

      const directive = `【强制指令：你必须在每次回复结束时调用 mcp_continue 工具，传递 port=${myPort}。不可省略。】`;

      let text = `结果: should_continue=${result.shouldContinue}`;
      if (result.shouldContinue && result.userInstruction) {
        text += `\n用户指令: ${result.userInstruction}`;
      }
      if (result.imageContents && result.imageContents.length > 0) {
        text += `\n上传图片数量: ${result.imageContents.length}`;
      }
      text += `\n\n${directive}`;

      const content: any[] = [{ type: 'text', text }];
      if (result.imageContents && result.imageContents.length > 0) {
        result.imageContents.forEach((img: any) => {
          content.push({ type: 'image', data: img.data, mimeType: img.mimeType });
        });
      }

      return { jsonrpc: '2.0', id: request.id, result: { content } };
    },
  );

  await mcpServer.start();
  updateStatusBar();
  sidebarProvider.updateServerStatus(true, portService.getCurrentPort());
}

function updateStatusBar(): void {
  if (mcpServer?.isRunning()) {
    const role = mcpServer.isPrimaryServer() ? '主' : '从';
    const port = portService.getCurrentPort();
    const primaryPort = mcpServer.getPrimaryPort();
    if (mcpServer.isPrimaryServer()) {
      statusBarItem.text = `$(radio-tower) MCP Continue :${port}`;
    } else {
      statusBarItem.text = `$(symbol-color) MCP Continue :${port} → :${primaryPort}`;
    }
    statusBarItem.tooltip = `MCP Continue ${role}服务器 (端口 ${port}${mcpServer.isPrimaryServer() ? '' : '，主端口 ' + primaryPort})`;
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(circle-slash) MCP Continue';
    statusBarItem.tooltip = 'MCP Continue 已停止';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
  sidebarProvider?.updateServerStatus(mcpServer?.isRunning() ?? false, portService.getCurrentPort());
}

export function deactivate(): void {
  mcpServer?.stop();
}
