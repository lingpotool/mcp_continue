import * as vscode from 'vscode';
import { ConfigService, getRulesTemplate } from './configService';
import { PortService } from './portService';

export interface AutoTaskState {
  running: boolean;
  remaining: string;
  intervalMin: number;
}

export class AutoTaskService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private remainingSeconds: number = 0;
  private intervalSeconds: number = 0;
  private running: boolean = false;
  private onTick: ((remaining: string) => void) | null = null;
  private lastSessionId: string = '';
  private createdCount: number = 0;

  constructor(
    private configService: ConfigService,
    private portService: PortService,
    private outputChannel: vscode.OutputChannel,
  ) {}

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private buildPrompt(): string {
    const customPrompt = this.configService.get('autoTaskPrompt');
    if (customPrompt && customPrompt.trim()) {
      const port = this.portService.getCurrentPort();
      return customPrompt.replace(/\$\{port\}/g, String(port));
    }
    return getRulesTemplate(this.portService.getCurrentPort());
  }

  private async createTask(): Promise<void> {
    const agentName = this.configService.get('autoTaskAgentName');
    const agentId = this.configService.get('autoTaskAgentId');
    const modelName = this.configService.get('autoTaskModelName');
    const prompt = this.buildPrompt();

    const options: Record<string, unknown> = {
      agentName,
      agentId,
      newSession: true,
    };
    if (modelName && modelName.trim()) {
      options.modelName = modelName;
    }

    this.outputChannel.appendLine(
      `[AutoTask] 创建任务 #${this.createdCount + 1}: agent=${agentName}, model=${modelName || '(默认)'}`
    );

    try {
      const result = await vscode.commands.executeCommand(
        'icube.chat.sendToAgentNonBlocking',
        [prompt],
        options,
      ) as { sessionId?: string };

      this.lastSessionId = result?.sessionId || '';
      this.createdCount++;
      this.outputChannel.appendLine(
        `[AutoTask] ✅ 创建成功: sessionId=${this.lastSessionId}, 累计 ${this.createdCount} 个任务`
      );
    } catch (e) {
      this.outputChannel.appendLine(`[AutoTask] ❌ 创建失败: ${e}`);
    }
  }

  start(onTick: (remaining: string) => void): void {
    if (this.running) return;

    const intervalMin = this.configService.get('autoTaskIntervalMin');
    this.intervalSeconds = Math.max(1, intervalMin) * 60;
    this.remainingSeconds = this.intervalSeconds;
    this.running = true;
    this.onTick = onTick;

    this.outputChannel.appendLine(
      `[AutoTask] 启动: 间隔 ${intervalMin} 分钟`
    );

    this.timer = setInterval(() => {
      this.remainingSeconds--;

      if (this.remainingSeconds <= 0) {
        this.createTask();
        this.remainingSeconds = this.intervalSeconds;
      }

      this.onTick?.(this.formatTime(this.remainingSeconds));
    }, 1000);

    this.onTick(this.formatTime(this.remainingSeconds));
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    this.onTick = null;
    this.outputChannel.appendLine(`[AutoTask] 已停止, 累计创建 ${this.createdCount} 个任务`);
  }

  getState(): AutoTaskState {
    return {
      running: this.running,
      remaining: this.formatTime(this.remainingSeconds),
      intervalMin: Math.round(this.intervalSeconds / 60),
    };
  }

  dispose(): void {
    this.stop();
  }
}
